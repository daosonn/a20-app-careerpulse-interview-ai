from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.memory import MemorySaver
from .state import InterviewState
from .profiler import extract_cv_info_logic, search_questions_logic
from .interviewer import generate_question_logic
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
        "current_phase": "Introduction"
    }

async def interviewer_node(state: InterviewState):
    """Integrates Interviewer logic directly."""
    # Wrap state in a MockReq-like object for generate_question_logic
    class MockReq:
        def __init__(self, state):
            self.cv_content = state["cv_content"]
            self.jd_content = state["jd_content"]
            self.chat_history = state["chat_history"]
            self.current_question_count = state["current_question_count"]
            self.interview_type = state["interview_type"]
            self.language = state["language"]
            self.is_stress_test = state["is_stress_test"]
            self.current_phase = state["current_phase"]
            self.skills_extracted = state["skills_extracted"]
            self.question_bank = state["question_bank"]

    req = MockReq(state)
    ai_text, next_phase, next_count = generate_question_logic(req)
    
    return {
        "chat_history": [{"role": "ai", "content": ai_text}],
        "current_phase": next_phase,
        "current_question_count": next_count
    }

async def evaluator_node(state: InterviewState):
    """Integrates Evaluator logic directly."""
    if len(state['chat_history']) < 2: return {}
    
    class MockReq:
        def __init__(self, state):
            self.last_ai_msg = state['chat_history'][-2]['content']
            self.last_user_msg = state['chat_history'][-1]['content']
            self.language = state['language']

    req = MockReq(state)
    evaluation = evaluate_star_logic(req)
    return {"evaluations": [evaluation]}

def route_next(state: InterviewState):
    """Determines the next step based on the phase."""
    if not state.get("current_phase"):
        return "profiler"
    
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
