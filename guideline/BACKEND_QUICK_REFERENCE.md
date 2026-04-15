# BACKEND API QUICK REFERENCE GUIDE

## 🚀 System Overview

**Type**: FastAPI + LangGraph Agentic Interview Platform  
**Tech Stack**: Python, SQLAlchemy, Firebase Auth, OpenAI APIs  
**Main Purpose**: Conduct automated online interviews with AI-powered evaluation

---

## 📋 API Endpoints Summary

### Authentication
All endpoints (except `/transcribe`) require Firebase bearer token:
```
Authorization: Bearer {firebase_id_token}
```

### User Management (`/api/v1/user`)

| Endpoint | Method | Purpose | Auth | Returns |
|----------|--------|---------|------|---------|
| `/onboard` | POST | Upload CV, extract skills, onboard user | ✓ | `{status, skills, user_id, info}` |
| `/profile` | GET | Get user profile info | ✓ | `{name, email, cv_text, skills, full_name, dob, current_position}` |

### Interview Management (`/api/v1/interview`)

| Endpoint | Method | Purpose | Auth | Returns |
|----------|--------|---------|------|---------|
| `/setup` | POST | Create session, analyze CV/JD, generate predicted Qs | ✓ | `{session_id, predicted_questions}` |
| `/start` | POST | Begin interview with LangGraph workflow | ✓ | `{first_question, audio_base64, current_phase, skills_extracted, question_bank}` |
| `/chat` | POST | Continue interview, evaluate answer, ask next Q | ✓ | `{reply, evaluations, last_evaluation, audio_base64, current_phase, should_end}` |
| `/end` | POST | Finalize interview, generate final report | ✓ | `{feedback, audio_base64}` |
| `/transcribe` | POST | Transcribe audio using Whisper API | - | `{text}` |

### History & Retrieval (`/api/v1/history`)

| Endpoint | Method | Purpose | Auth | Returns |
|----------|--------|---------|------|---------|
| `/` | GET | List all user's past interviews | ✓ | `[{id, interview_type, created_at, score, language}]` |
| `/{interview_id}` | GET | Get detailed interview record | ✓ | `{id, cv_text, jd_text, transcript, evaluations, final_report, created_at}` |

---

## 🔑 Key Request/Response Patterns

### POST /user/onboard
```json
// Request
{
  "cv_text": "...",
  "name": "John Doe"
}

// Response (200)
{
  "status": "success",
  "skills": ["Python", "FastAPI", "LLM"],
  "user_id": 42,
  "info": {
    "full_name": "John Smith Doe",
    "dob": "1990-01-15",
    "current_position": "Senior Dev",
    "skills": [...]
  }
}
```

### POST /interview/setup
```json
// Request
{
  "cv_text": "...",
  "jd_text": "...",
  "interview_type": "Behavioral",  // or "Technical"
  "language": "vi",                 // or "en"
  "is_stress_test": false
}

// Response (200)
{
  "session_id": 123,
  "predicted_questions": [
    "Tell me about yourself",
    "Why are you interested in this role?",
    ...
  ]
}
```

### POST /interview/start
```json
// Request (query param)
?session_id=123

// Response (200)
{
  "first_question": "Tell me about your background...",
  "audio_base64": "SUQzBAAAI1...",  // MP3 encoded
  "current_phase": "Introduction",
  "skills_extracted": ["Python", "FastAPI"],
  "question_bank": "Câu hỏi liên quan đến: Python, FastAPI, ..."
}
```

### POST /interview/chat
```json
// Request
{
  "message": "I have 5 years of experience with Python...",
  "history": [
    {"role": "ai", "content": "Tell me about yourself..."},
    {"role": "user", "content": "..."}
  ],
  "cv_text": "...",
  "jd_text": "...",
  "question_count": 1,
  "interview_type": "Behavioral",
  "language": "vi",
  "current_phase": "Introduction",
  "skills_extracted": ["Python"],
  "question_bank": "...",
  "evaluations": ["..."],
  "session_id": "123"
}

// Response (200)
{
  "reply": "Great! Can you tell me more about...",
  "evaluations": [
    {
      "scores": {
        "clarity": 4,
        "relevance": 5,
        "technical_depth": 3,
        "confidence": 4
      },
      "feedback": "Clear response with good examples",
      "betterVersion": "I have 5+ years of experience..."
    }
  ],
  "last_evaluation": {...},
  "audio_base64": "SUQzBAAAI1...",
  "current_phase": "CV Deep-Dive",
  "should_end": false
}
```

### POST /interview/end
```json
// Request
{
  "history": [
    {"role": "ai", "content": "Q1..."},
    {"role": "user", "content": "A1..."},
    ...
  ],
  "evaluations": ["eval1", "eval2", ...],
  "cv_text": "...",
  "jd_text": "...",
  "interview_type": "Behavioral",
  "language": "vi"
}

// Response (200)
{
  "feedback": "Overall Impression:\nYou demonstrated...",
  "audio_base64": "SUQzBAAAI1..."
}
```

---

## 🎯 Critical Decision Points

### 1. Onboarding Check
```python
# Enforced on:
# - POST /interview/start
# - GET /history
# If not onboarded → 403 Forbidden
if not current_user.is_onboarded:
    return 403  # "Tài khoản chưa hoàn thành Onboarding"
```

### 2. Session Ownership
```python
# Before accessing interview:
interview = db.query(Interview).filter(
    Interview.id == session_id,
    Interview.user_id == current_user.id  # ← Critical
).first()

if not interview:
    return 404  # Returns 404 even if interview exists but belongs to another user
```

### 3. Phase Progression Logic
```python
# In interviewer_node():
if current_question_count > 0 and current_question_count % 2 == 0 and current_question_count < 13:
    # Move to next phase
    current_phase = PHASES[PHASES.index(current_phase) + 1]

if current_question_count >= 13:
    # Force closing phase
    current_phase = "Closing"
```

### 4. Evaluator Skip Condition
```python
# In evaluator_node():
if len(chat_history) < 2:
    return {}  # Skip evaluation, no feedback yet

# Evaluates last AI message vs last user message
```

### 5. Interview Completion Check
```python
# On client side (from /chat response):
if should_end == True:  # when current_phase == "Closing"
    # Prepare to call POST /interview/end
    # Upload final transcript, all evaluations
```

---

## 🔄 Interview Flow States

| State | Endpoint | DB Status | Next |
|-------|----------|-----------|------|
| Not Onboarded | - | `User.is_onboarded=False` | POST /user/onboard |
| Onboarded | GET /user/profile | `User.is_onboarded=True` | POST /interview/setup |
| Setup Created | POST /interview/setup | `Interview.status=setup` | POST /interview/start |
| In Progress | POST /interview/start | `Interview.status=in_progress` | POST /interview/chat (loop) |
| Closing Phase | POST /interview/chat (phase=Closing) | `Interview.status=in_progress` | POST /interview/end |
| Completed | POST /interview/end | `Interview.status=completed` | GET /history |

---

## ⚙️ LangGraph Workflow Nodes

### Node: Profiler
```
Input: cv_content
Process: 
  - Extract skills using LLM
  - Mock RAG search for relevant questions
Output: 
  - skills_extracted: list[str]
  - question_bank: str
  - current_phase: "Introduction"
```

### Node: Interviewer
```
Input: Full InterviewState
Process:
  - Check phase transition logic (every 2 Qs)
  - Build system prompt with context (CV, JD, skills, chat history)
  - Call GPT-4o to generate question
  - Apply language & stress-test settings
Output:
  - chat_history: [append {"role": "ai", "content": question}]
  - current_phase: updated
  - current_question_count: incremented
```

### Node: Evaluator
```
Input: Full InterviewState (need ≥2 messages)
Process:
  - Extract last AI message (question)
  - Extract last user message (answer)
  - Build STAR evaluation prompt
  - Call GPT-4o for structured eval
Output:
  - evaluations: [append JSON evaluation]
```

### Routing Logic
```
if no current_phase:
    route_next() → profiler
elif last_msg.role == "user":
    route_next() → evaluator
else:
    route_next() → interviewer
```

---

## 🌐 Error Codes & Handling

| Code | Scenario | Message |
|------|----------|---------|
| 400 | Missing required field | FastAPI validation |
| 401 | Invalid/expired Firebase token | "Could not validate credentials" |
| 403 | User not onboarded | "Tài khoản chưa hoàn thành Onboarding" |
| 404 | Interview not found or unauthorized | "Session not found" or "Interview not found" |
| 500 | LLM failure, DB error, etc. | Error detail |
| 413 | Audio file too large (implicit) | FastAPI file size limit |

---

## 🔐 Security Notes

✓ **Firebase Auth**: All endpoints verify bearer token  
✓ **User Isolation**: Thread_id format `user_{user_id}_{session_id}`  
✓ **Query Filters**: All DB queries include `user_id` check  
⚠️ **CORS**: Currently `allow_origins=["*"]` - should restrict to frontend domain  
⚠️ **Rate Limiting**: Not implemented - consider adding  
✓ **Input Validation**: Pydantic models validate all requests  

---

## 📊 Database Models

### User Table
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| email | String UK | Firebase email |
| name | String | Display name |
| avatar | String | Avatar URL |
| cv_text | Text | Raw CV |
| skills | JSON | Extracted skills |
| is_onboarded | Boolean | Flag |
| full_name | String | From CV |
| dob | String | From CV |
| current_position | String | From CV |

### Interview Table
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| user_id | Integer FK | Owner |
| cv_text | Text | Candidate CV |
| jd_text | Text | Job description |
| interview_type | String | Behavioral/Technical |
| language | String | vi/en |
| transcript | JSON | Chat history |
| evaluations | JSON | STAR evaluations |
| final_report | Text | Feedback |
| score | Integer | Interview score |
| status | String | setup/in_progress/completed |
| predicted_questions | JSON | From /setup |
| created_at | DateTime | Timestamp |

---

## 🛠️ Configuration

### Environment Variables
```
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
FIREBASE_API_KEY=...
```

### LLM Models Used
- **Interview Questions**: gpt-4o (~0.7 temp) - creative
- **Evaluator**: gpt-4o (~0.2 temp) - consistent
- **CV Extraction**: gpt-4o (~0.7 temp)
- **Final Report**: gpt-4o (~0.7 temp)
- **TTS**: tts-1-hd (nova voice)
- **Transcription**: whisper-1

### Interview Parameters
- **Max Questions**: 15
- **Phase Count**: 7 phases
- **Phase Transition**: Every 2 questions
- **Stress Mode**: Flag-based (hardcoded False, TODO)
- **Languages**: Vietnamese (vi), English (en)
- **Interview Types**: Behavioral, Technical

---

## 📈 Performance Tips

1. **Reduce LLM Calls**: Cache CV extractions, question banks
2. **Stream TTS Audio**: Don't wait for full audio generation
3. **Async DB**: Use async SQLAlchemy for non-blocking I/O
4. **State Persistence**: Switch from MemorySaver to PostgreSQL
5. **Load Balancing**: Run multiple Uvicorn workers
6. **Rate Limiting**: Add request throttling per user/session

---

## 🧪 Testing Checklist

- [ ] Firebase token validation
- [ ] User onboarding flow
- [ ] Interview setup (LLM integration)
- [ ] Interview start (LangGraph initialization)
- [ ] Chat loop (Evaluator + Interviewer nodes)
- [ ] Phase progression (every 2 Qs)
- [ ] Closing detection (phase = Closing)
- [ ] Final report generation
- [ ] History retrieval
- [ ] User isolation (can't access others' data)
- [ ] Error handling (401, 403, 404, 500)
- [ ] Audio transcription
- [ ] TTS generation
- [ ] Database persistence
- [ ] Concurrent user handling

---

## 📞 Support Resources

**Files**:
- [Interview Endpoints](../app/api/v1/endpoints/interview.py)
- [LangGraph Workflow](../app/services/graph.py)
- [Interviewer Logic](../app/services/interviewer.py)
- [Evaluator Logic](../app/services/evaluator.py)
- [Main App](../app/main.py)

**External APIs**:
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)

---

## 🎓 Key Takeaways

1. **Two-Phase Interview**: Setup (async LLM analysis) → Live (streaming LangGraph)
2. **LangGraph Orchestration**: Profiler → Interviewer → Evaluator feedback loop
3. **7-Phase Interview Structure**: Intro → CV → Job-fit → Behavioral → Motivation → Q&A → Closing
4. **LLM-Driven**: Every question, evaluation, and report generated by GPT-4o
5. **Audio-First UX**: Questions + feedback returned as speech (TTS) + text
6. **User Isolation**: Firebase auth + DB query filters ensure data safety
7. **Stateful Workflow**: LangGraph MemorySaver tracks conversation per thread_id

