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
    info = extract_cv_info_logic(state["cv_content"])
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
        # Generate new batch of 3
        # In a real system, we'd pass evaluations/history to inform the next batch
        new_batch = generate_ai_batch(state)
        pending.extend(new_batch)
    
    if not pending:
        # End of interview
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
    evaluation = evaluate_star_logic(req)
    return {"evaluations": [evaluation]}

def route_next(state: InterviewState):
    """Determines the next step based on the phase."""
    if not state.get("current_phase"):
        return "profiler"
    
    if state.get("current_phase") == "Closing":
        return END

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

# Persistence
checkpointer = MemorySaver()

# Compile
app_graph = workflow.compile(checkpointer=checkpointer)
