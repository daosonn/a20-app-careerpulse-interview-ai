import asyncio
import os
import sqlite3
from contextlib import ExitStack
from pathlib import Path

from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.sqlite import SqliteSaver

from app.core.database import DATABASE_URL
from app.core.logger import log_func
from .state import InterviewState
from .profiler import extract_cv_info_logic, search_questions_logic
from .interviewer import generate_ai_batch
from .evaluator import evaluate_star_logic

# Standard retry policy
retry_policy = {"max_attempts": 3}
_CHECKPOINT_STACK = ExitStack()

async def profiler_node(state: InterviewState):
    log_func("profiler_node")
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
    log_func("interviewer_node")
    """Orchestrates dynamic batch generation and question popping."""
    pending = list(state.get("pending_questions", []))
    count = state.get("total_question_count", 0)
    max_count = state.get("max_question_count", 5) or 5

    if count >= max_count:
        return {
            "chat_history": [{"role": "ai", "content": "Thank you for the interview. We will now wrap up the session."}],
            "pending_questions": [],
            "current_phase": "Closing",
        }
    
    # Check if we need a new batch
    if not pending and count < max_count:
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
    phase = item.get("phase") or state.get("current_phase") or "Behavioral"
    
    return {
        "chat_history": [{"role": "ai", "content": next_q, "tip": tip}],
        "pending_questions": pending,
        "total_question_count": count + 1,
        "current_phase": phase,
        "current_model_answer": model_ans,
        "current_tip": tip
    }

async def evaluator_node(state: InterviewState):
    log_func("evaluator_node")
    """Integrates Evaluator logic with model answer comparison."""
    if len(state['chat_history']) < 2: return {}
    
    class MockReq:
        def __init__(self, state):
            log_func("MockReq.__init__", level=2)
            self.last_ai_msg = state['chat_history'][-2]['content']
            self.last_user_msg = state['chat_history'][-1]['content']
            self.language = state['language']
            self.model_answer = state.get("current_model_answer", "")

    req = MockReq(state)
    evaluation = await evaluate_star_logic(req)
    return {"evaluations": [evaluation]}

async def unified_node(state: InterviewState):
    log_func("unified_node")
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
    log_func("route_next", level=2)
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

def _postgres_checkpoint_url() -> str:
    log_func("_postgres_checkpoint_url", level=2)
    return DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://", 1)


def _build_checkpointer():
    log_func("_build_checkpointer", level=2)
    if DATABASE_URL.startswith("sqlite"):
        from app.core.config import SQL_DATA_DIR
        default_path = SQL_DATA_DIR / "langgraph_checkpoints.sqlite"
        checkpoint_path = Path(os.getenv("LANGGRAPH_CHECKPOINT_SQLITE_PATH", str(default_path)))
        checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(checkpoint_path), check_same_thread=False)
        saver = SqliteSaver(conn)
        saver.setup()
        return saver

    if DATABASE_URL.startswith("postgresql"):
        try:
            from langgraph.checkpoint.postgres import PostgresSaver
        except ImportError as exc:
            raise RuntimeError(
                "Postgres LangGraph checkpointing requires "
                "`langgraph-checkpoint-postgres`. Install backend requirements."
            ) from exc

        saver = _CHECKPOINT_STACK.enter_context(
            PostgresSaver.from_conn_string(_postgres_checkpoint_url())
        )
        saver.setup()
        return saver

    raise RuntimeError(f"Unsupported DATABASE_URL for LangGraph checkpointing: {DATABASE_URL}")


# Persistence
checkpointer = _build_checkpointer()

# Compile
app_graph = workflow.compile(checkpointer=checkpointer)
