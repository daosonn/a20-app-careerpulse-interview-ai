from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.memory import MemorySaver
import httpx
import os
import sys
from typing import Dict, Any

# Project imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from src.core.state import InterviewState

# Service URLs (configured via env or defaults for microservices)
PROFILER_URL = os.getenv("PROFILER_URL", "http://127.0.0.1:8001")
INTERVIEWER_URL = os.getenv("INTERVIEWER_URL", "http://127.0.0.1:8002")
EVALUATOR_URL = os.getenv("EVALUATOR_URL", "http://127.0.0.1:8003")

# Common retry policy
retry_policy = {"max_attempts": 3}

async def profiler_node(state: InterviewState):
    """Calls Profiler Microservice to extract skills and question bank."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{PROFILER_URL}/process",
                json={"cv_content": state["cv_content"], "jd_content": state["jd_content"]}
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "skills_extracted": data.get("skills_extracted", []),
                "question_bank": data.get("question_bank", ""),
                "current_phase": "Introduction"
            }
    except Exception as e:
        print(f"[ERROR] Profiler Service: {e}")
        return {
            "skills_extracted": [],
            "question_bank": "Service unavailable",
            "current_phase": "Introduction"
        }


async def interviewer_node(state: InterviewState):
    """Calls Interviewer Microservice to generate the next response."""
    payload = {
        "cv_content": state["cv_content"],
        "jd_content": state["jd_content"],
        "chat_history": state["chat_history"],
        "current_question_count": state["current_question_count"],
        "interview_type": state["interview_type"],
        "language": state["language"],
        "is_stress_test": state["is_stress_test"],
        "current_phase": state["current_phase"]
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{INTERVIEWER_URL}/next-question", json=payload)
            response.raise_for_status()
            data = response.json()
            
            return {
                "chat_history": [{"role": "ai", "content": data["ai_response"]}],
                "current_phase": data["current_phase"],
                "current_question_count": data["current_question_count"]
            }
    except Exception as e:
        print(f"[ERROR] Interviewer Service: {e}")
        return {
            "chat_history": [{"role": "ai", "content": "I apologize, but I'm having trouble connecting to my logic system. Please try again in a moment."}],
        }


async def evaluator_node(state: InterviewState):
    """Calls Evaluator Microservice to assess the user's last answer."""
    if len(state['chat_history']) < 2: return {}
    
    payload = {
        "last_ai_msg": state['chat_history'][-2]['content'],
        "last_user_msg": state['chat_history'][-1]['content'],
        "language": state['language']
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{EVALUATOR_URL}/evaluate", json=payload)
            response.raise_for_status()
            data = response.json()
            return {"evaluations": [data["evaluation"]]}
    except Exception as e:
        print(f"[ERROR] Evaluator Service: {e}")
        return {"evaluations": ["Evaluation currently unavailable"]}


def route_next(state: InterviewState):
    """Determines the next step based on the phase."""
    if not state.get("current_phase"):
        return "profiler"
    
    # If a user just answered (last message is user), evaluate it
    if state["chat_history"] and state["chat_history"][-1]["role"] == "user":
        return "evaluator"
    
    return "interviewer"

# Workflow construction
workflow = StateGraph(InterviewState)

# Nodes
workflow.add_node("profiler", profiler_node, retry=retry_policy)
workflow.add_node("interviewer", interviewer_node, retry=retry_policy)
workflow.add_node("evaluator", evaluator_node, retry=retry_policy)

# Edges
workflow.add_conditional_edges(START, route_next)
workflow.add_edge("profiler", "interviewer")
workflow.add_edge("evaluator", "interviewer")
workflow.add_edge("interviewer", END)

# Persistence - Keep state between messages using thread_id
checkpointer = MemorySaver()

# Compile the graph
app_graph = workflow.compile(checkpointer=checkpointer)
