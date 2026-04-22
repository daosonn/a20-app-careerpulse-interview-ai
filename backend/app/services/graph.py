import asyncio
from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.memory import MemorySaver
from .state import InterviewState
from .profiler import extract_cv_info_logic, search_questions_logic
from .interviewer import generate_ai_batch
from .evaluator import evaluate_star_logic

# Standard retry policy
retry_policy = {"max_attempts": 3}

async def profiler_node(state: InterviewState):
    """Integrates Profiler logic directly."""
    # Parallelize extraction and search (though search is mock now)
    info = await extract_cv_info_logic(state["cv_content"])
    skills = info.get("skills", [])
    questions = search_questions_logic(skills)
    
    return {
        "skills_extracted": skills,
        "question_bank": questions,
        "current_phase": "Introduction",
        "pending_questions": [],
        "total_question_count": 0,
        "current_model_answer": "",
        "current_tip": ""
    }

async def interviewer_node(state: InterviewState):
    """Orchestrates dynamic batch generation and question popping."""
    pending = list(state.get("pending_questions", []))
    count = state.get("total_question_count", 0)
    
    # Check if we need a new batch
    if not pending and count < 9:
        new_batch = await generate_ai_batch(state)
        pending.extend(new_batch)
    
    if not pending:
        return {
            "chat_history": [{"role": "ai", "content": "Thank you for the interview. We will get back to you soon."}],
            "current_phase": "Closing"
        }
    
    # Pop the first question
    item = pending.pop(0)
    next_q = item["question"]
    tip = item.get("tip", "")
    model_ans = item.get("model_answer", "")
    
    return {
        "chat_history": [{"role": "ai", "content": next_q, "tip": tip}],
        "pending_questions": pending,
        "total_question_count": count + 1,
        "current_model_answer": model_ans,
        "current_tip": tip
    }

async def evaluator_node(state: InterviewState):
    """Integrates Evaluator logic with model answer comparison."""
    if len(state['chat_history']) < 2: return {}
    
    class MockReq:
        def __init__(self, state):
            self.last_ai_msg = state['chat_history'][-2]['content']
            self.last_user_msg = state['chat_history'][-1]['content']
            self.language = state['language']
            self.model_answer = state.get("current_model_answer", "")

    req = MockReq(state)
    evaluation = await evaluate_star_logic(req)
    return {"evaluations": [evaluation]}

async def unified_node(state: InterviewState):
    """
    RUNS EVALUATOR AND INTERVIEWER IN PARALLEL.
    This is the key to reducing latency.
    """
    # 1. Start Evaluator and Interviewer tasks simultaneously
    # Interviewer node needs to know if pending is empty to decide whether to generate batch.
    
    eval_task = asyncio.create_task(evaluator_node(state))
    interview_task = asyncio.create_task(interviewer_node(state))
    
    # Wait for both to finish
    eval_result, interview_result = await asyncio.gather(eval_task, interview_task)
    
    # Merge results
    final_result = {**interview_result}
    if eval_result.get("evaluations"):
        final_result["evaluations"] = state.get("evaluations", []) + eval_result["evaluations"]
    
    return final_result

def route_next(state: InterviewState):
    """Determines the next step based on the phase."""
    if not state.get("current_phase"):
        # Optimization: Skip profiler if skills are already extracted
        if state.get("skills_extracted"):
            return "unified"
        return "profiler"
    
    if state.get("current_phase") == "Closing":
        return END

    return "unified"

# Workflow construction
workflow = StateGraph(InterviewState)

# Nodes
workflow.add_node("profiler", profiler_node, retry=retry_policy)
workflow.add_node("unified", unified_node, retry=retry_policy)

# Edges
workflow.add_conditional_edges(START, route_next)
workflow.add_edge("profiler", "unified")
workflow.add_edge("unified", END)

# Persistence
checkpointer = MemorySaver()

# Compile
app_graph = workflow.compile(checkpointer=checkpointer)

