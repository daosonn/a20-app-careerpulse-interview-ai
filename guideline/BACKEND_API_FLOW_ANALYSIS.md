# PHÂN TÍCH FLOW HOẠT ĐỘNG CỦA HỆ THỐNG API - BACKEND

## 1. TỔNG QUAN KIẾN TRÚC

### Stack Công Nghệ
- **Framework**: FastAPI (Python)
- **ORM**: SQLAlchemy
- **Authentication**: Firebase Admin SDK
- **Orchestration**: LangGraph (Agentic workflow)
- **LLM**: OpenAI (GPT-4o, Whisper)
- **State Management**: In-memory checkpointer (LangGraph MemorySaver)
- **Audio**: OpenAI TTS (Text-to-Speech)

### Cấu Trúc Thư Mục
```
backend/app/
├── main.py                 # Khởi tạo FastAPI app, CORS middleware
├── api/v1/
│   └── api.py             # APIRouter chính, tập hợp các endpoints
│   └── endpoints/
│       ├── user.py        # User management (onboarding, profile)
│       ├── interview.py    # Interview lifecycle (setup, start, chat, end)
│       └── history.py      # Interview history & retrieval
├── core/
│   ├── auth.py            # Firebase authentication, CurrentUser dependency
│   ├── database.py        # SQLAlchemy setup, database session
│   └── config.py          # LLM factory (OpenAI configurations)
├── models/
│   └── models.py          # User & Interview database models
├── schemas/
│   ├── user.py            # Pydantic models cho user endpoints
│   ├── interview.py       # Pydantic models cho interview endpoints
│   └── internal.py        # Internal data structures
└── services/
    ├── state.py           # InterviewState TypedDict definition
    ├── graph.py           # LangGraph workflow orchestration
    ├── profiler.py        # CV analysis & skill extraction
    ├── interviewer.py     # Question generation logic
    ├── evaluator.py       # STAR method evaluation
    └── reporter.py        # Final feedback report generation
```

---

## 2. DATABASE SCHEMA

### User Model
| Field | Type | Description |
|-------|------|---|
| id | Integer PK | User ID |
| email | String | Firebase email (unique) |
| name | String | Display name |
| avatar | String | Avatar URL |
| cv_text | Text | Raw CV content |
| skills | JSON | Extracted skills list |
| is_onboarded | Boolean | Onboarding completion flag |
| full_name | String | Full name from CV |
| dob | String | Date of birth |
| current_position | String | Current job position |

### Interview Model
| Field | Type | Description |
|-------|------|---|
| id | Integer PK | Interview session ID |
| user_id | Integer FK | Reference to User |
| cv_text | Text | Candidate's CV |
| jd_text | Text | Job description |
| interview_type | String | "Behavioral" or "Technical" |
| language | String | "vi" (Vietnamese) or "en" (English) |
| transcript | JSON | Chat history [{role, content}] |
| evaluations | JSON | STAR evaluations for each Q&A pair |
| final_report | Text | Feedback report |
| score | Integer | Overall Interview score |
| status | String | "setup" \| "in_progress" \| "completed" |
| predicted_questions | JSON | Pre-generated questions from /setup |
| created_at | DateTime | Timestamp |

---

## 3. API ENDPOINTS & FLOW ANALYSIS

### 3.1 USER ENDPOINTS (`/api/v1/user`)

#### **3.1.1 POST /api/v1/user/onboard**

**Purpose**: Onboard user by uploading CV

**Authorization**: Required (CurrentUser via Firebase token)

**Request Schema**:
```python
class OnboardReq(BaseModel):
    cv_text: str  # Raw CV text
    name: str     # User's name (optional override)
```

**Flow**:
```
1. Verify user authentication
   └─> If failed: Return 401 Unauthorized

2. Extract CV info using LLM
   └─> Call extract_cv_info_logic(cv_text)
   ├─> Prompt GPT-4o to analyze CV
   ├─> Parse JSON response: {skills, full_name, dob, current_position}
   └─> Fallback: {"skills": ["Kỹ năng chung"]} if error

3. Update User record in DB
   ├─> Set cv_text = request CV
   ├─> Set skills = extracted skills
   ├─> Set full_name, dob, current_position from LLM response
   ├─> Set is_onboarded = True
   └─> db.commit()

4. Return success
   └─> {"status": "success", "skills": [...], "user_id": N, "info": {...}}
```

**Error Cases**:
- No CV text: FastAPI validation error (400)
- LLM extraction fails: Fallback with generic skills, continue
- Database commit fails: Rollback, return 500

**Decision Points**:
- If `current_user.is_onboarded == True`: Can skip onboarding, update existing CV

---

#### **3.1.2 GET /api/v1/user/profile**

**Purpose**: Retrieve user profile information

**Authorization**: Required (CurrentUser)

**Flow**:
```
1. Verify user authentication
   └─> Return 401 if token invalid

2. Return user profile from DB
   └─> Return all user fields: {name, email, cv_text, skills, dob, ...}
```

**Response**:
```json
{
  "onboarded": true,
  "cv_text": "...",
  "skills": ["Python", "FastAPI"],
  "name": "John Doe",
  "full_name": "John Smith Doe",
  "dob": "1990-01-15",
  "current_position": "Senior Developer"
}
```

---

### 3.2 INTERVIEW ENDPOINTS (`/api/v1/interview`)

#### **3.2.1 POST /api/v1/interview/setup**

**Purpose**: Initial setup - analyze CV & JD, generate predicted questions

**Authorization**: Required (CurrentUser)

**Request Schema**:
```python
class SetupReq(BaseModel):
    cv_text: str
    jd_text: str
    interview_type: str = "Behavioral"  # or "Technical"
    language: str = "vi"               # or "en"
    is_stress_test: bool = False
    session_id: str = "default_user"
```

**Flow**:
```
1. Verify authentication
   └─> If failed: Return 401

2. Generate predicted questions
   ├─> Prompt: "Analyze CV & JD for {interview_type} interview"
   ├─> Call GPT-4o: gpt-4o model
   └─> Parse response into question list

3. Save new Interview record to DB
   ├─> Create new Interview object:
   │   ├─> user_id = current_user.id
   │   ├─> cv_text, jd_text from request
   │   ├─> interview_type, language from request
   │   ├─> predicted_questions from LLM response
   │   └─> status = "setup"
   ├─> db.add(new_interview)
   └─> db.commit()

4. Return session info
   └─> {"session_id": interview.id, "predicted_questions": [...]}
```

**Error Cases**:
- No CV/JD text: FastAPI validation (400)
- LLM failure: Return 500

**Side Effects**:
- Creates new Interview record in DB (status="setup")
- Does NOT start interview workflow yet

---

#### **3.2.2 POST /api/v1/interview/transcribe**

**Purpose**: Transcribe audio to text using OpenAI Whisper

**Authorization**: Optional (CurrentUser)

**Request**: Multipart form with audio file

**Flow**:
```
1. Write uploaded file to temp location
   ├─> Use mkstemp() to create safe temp file
   └─> Write file contents

2. Transcribe using Whisper API
   ├─> Call OpenAI: model="whisper-1"
   └─> Return transcribed text

3. Clean up temp file
   └─> os.unlink(tmp_path)

4. Return transcription
   └─> {"text": "transcribed audio content"}
```

**Error Cases**:
- File write fails: Return 500
- Whisper API fails: Return 500 with error detail
- Temp cleanup fails: Attempt removal, continue

**Retry Logic**: Max 3 attempts at infrastructure level

---

#### **3.2.3 POST /api/v1/interview/start**

**Purpose**: START the actual interview workflow using LangGraph

**Authorization**: Required (CurrentUser)

**Request**: 
```
Query param: session_id (Interview ID from /setup)
```

**Flow**:
```
1. Verify authentication
   └─> If not authenticated: Return 401

2. Check onboarding status
   ├─> If current_user.is_onboarded == False
   └─> Return 403: "Tài khoản chưa hoàn thành Onboarding"

3. Fetch Interview record from DB
   ├─> Query: Interview.id == session_id AND Interview.user_id == current_user.id
   └─> If not found: Return 404

4. Update Interview status
   └─> interview.status = "in_progress"

5. Construct Initial State
   ├─> cv_content = interview.cv_text
   ├─> jd_content = interview.jd_text
   ├─> chat_history = []
   ├─> current_question_count = 0
   ├─> interview_type, language from interview
   ├─> is_stress_test = False (from UI later)
   ├─> current_phase = None
   ├─> skills_extracted = []
   ├─> question_bank = ""
   ├─> evaluations = []
   └─> final_report = ""

6. Create secure thread_id
   └─> thread_id = f"user_{user_id}_{session_id}"
   └─> (Ensures isolation per user/session)

7. Invoke LangGraph workflow (app_graph.ainvoke)
   └─> [See 3.6 LangGraph Orchestration below]

8. Extract AI response
   └─> ai_text = result['chat_history'][-1]['content']

9. Generate TTS audio
   ├─> Call OpenAI TTS (TTS-1-HD, nova voice)
   └─> Return Base64-encoded MP3

10. Return response
    ├─> first_question: AI text
    ├─> audio_base64: MP3 encoded
    ├─> current_phase: from result
    ├─> skills_extracted: [...] from result
    └─> question_bank: from result
```

**Decision Points**:
- Is user onboarded? → 403 if not
- Session exists and belongs to user? → 404 if not

**Branching Workflow** (Inside app_graph):
- If current_phase is None: Route to "profiler" node
- Otherwise: Route to "interviewer" node

---

#### **3.2.4 POST /api/v1/interview/chat**

**Purpose**: Continue interview conversation in LangGraph workflow

**Authorization**: Required (CurrentUser)

**Request Schema**:
```python
class ChatReq(BaseModel):
    message: str                      # User's answer to question
    history: List[ChatMsg]            # Chat history from frontend
    cv_text: str
    jd_text: str
    question_count: int
    evaluations: List[str] = []
    interview_type: str = "Behavioral"
    language: str = "vi"
    is_stress_test: bool = False
    current_phase: Optional[str] = "Introduction"
    skills_extracted: Optional[List[str]] = []
    question_bank: Optional[str] = ""
    session_id: Optional[str] = "default_user"
```

**Flow**:
```
1. Verify authentication
   └─> If failed: Return 401

2. Create secure thread_id
   └─> thread_id = f"user_{current_user.id}_{session_id or 'default'}"

3. Prepare input state
   └─> new_input = {
         "chat_history": [{"role": "user", "content": req.message}]
       }

4. Invoke LangGraph workflow
   ├─> app_graph.ainvoke(new_input, config={"configurable": {"thread_id": ...}})
   ├─> [See 3.6 LangGraph Orchestration for details on:
   │   ├─> Evaluator node (evaluate user's previous answer)
   │   ├─> Interviewer node (generate next question)
   │   └─> Phase tracking and question counting]
   └─> Workflow updates chat_history, evaluations, current_phase

5. Extract results
   ├─> ai_text = result['chat_history'][-1]['content']
   ├─> current_phase = result.get('current_phase')
   ├─> current_evals = result.get('evaluations', [])
   └─> last_eval = current_evals[-1] if any else None

6. Check if interview should end
   └─> if current_phase == "Closing": should_end = True

7. Generate TTS audio
   └─> Call OpenAI TTS for ai_text

8. Return response
   ├─> reply: AI text response
   ├─> evaluations: all evaluations so far
   ├─> last_evaluation: most recent eval
   ├─> audio_base64: MP3
   ├─> current_phase: phase name
   └─> should_end: boolean
```

**Decision Points**:
- Is current_phase "Closing"? → should_end = True
- Does chat_history have 2+ messages? → Run evaluator node
- Question count reached max (13)? → transition to "Closing" phase

**Error Cases**:
- Invalid session_id format: Thread_id created anyway
- LangGraph invocation fails: Return 500

---

#### **3.2.5 POST /api/v1/interview/end**

**Purpose**: Finalize interview and generate report

**Authorization**: Required (CurrentUser)

**Request Schema** (extends ChatReq):
```python
class ChatReq(BaseModel):
    message: str
    history: List[ChatMsg]            # Complete chat history
    evaluations: List[str]            # All evaluations
    cv_text: str
    jd_text: str
    interview_type: str
    language: str
    # ... other fields
```

**Flow**:
```
1. Verify authentication
   └─> If failed: Return 401

2. Prepare chat history
   └─> history = [{"role": msg.role, "content": msg.content} for msg in req.history]

3. Generate final report using LLM
   ├─> Call generate_report_logic(req)
   ├─> Prompt GPT-4o with:
   │   ├─> Chat history (all Q&A)
   │   ├─> All evaluations
   │   └─> Language preference
   ├─> Response structure:
   │   ├─> 1. Overall Impression
   │   ├─> 2. Deep Dive Analysis
   │   ├─> 3. Technical Skill Gap
   │   └─> 4. Improvement Roadmap (3 actions)
   └─> Return feedback_text

4. Save final Interview record to DB
   ├─> Create new Interview:
   │   ├─> user_id = current_user.id
   │   ├─> cv_text, jd_text from request
   │   ├─> interview_type, language
   │   ├─> transcript = history (all messages)
   │   ├─> evaluations = all evaluations
   │   ├─> final_report = feedback_text
   │   └─> score = 85 (hardcoded for now)
   ├─> db.add(new_interview)
   └─> db.commit()

5. Generate TTS for feedback
   └─> audio_base64 = TTS(feedback_text)

6. Return response
   ├─> feedback: final report text
   └─> audio_base64: MP3 of feedback
```

**Side Effects**:
- Creates new completed Interview record
- Saves transcript, evaluations, final report to DB
- Audio generated for feedback

---

### 3.3 HISTORY ENDPOINTS (`/api/v1/history`)

#### **3.3.1 GET /api/v1/history**

**Purpose**: List all past interviews for current user

**Authorization**: Required (CurrentUser)

**Flow**:
```
1. Verify authentication
   └─> If failed: Return 401

2. Check onboarding
   ├─> If current_user.is_onboarded == False
   └─> Return 403: "Onboarding required"

3. Query all interviews for user
   ├─> Query: Interview.user_id == current_user.id
   └─> Order by created_at DESC (newest first)

4. Format response
   ├─> For each interview:
   │   ├─> id
   │   ├─> interview_type
   │   ├─> created_at (ISO format)
   │   ├─> score
   │   └─> language
   └─> Return list

5. Return response
   └─> [
         {
           "id": 1,
           "interview_type": "Behavioral",
           "created_at": "2026-04-15T10:30:00",
           "score": 85,
           "language": "vi"
         },
         ...
       ]
```

**Filter/Sort**:
- Only user's own interviews (via user_id)
- Descending by created_at

---

#### **3.3.2 GET /api/v1/history/{interview_id}**

**Purpose**: Retrieve detailed interview record

**Authorization**: Required (CurrentUser)

**Path Parameter**: interview_id (Interview ID)

**Flow**:
```
1. Verify authentication
   └─> If failed: Return 401

2. Query specific interview
   ├─> Query: Interview.id == interview_id AND Interview.user_id == current_user.id
   └─> If not found: Return 404

3. Check ownership
   ├─> If interview.user_id != current_user.id
   └─> Return 404 (unauthorized)

4. Return interview details
   └─> {
         "id": interview.id,
         "cv_text": interview.cv_text,
         "jd_text": interview.jd_text,
         "interview_type": interview.interview_type,
         "language": interview.language,
         "transcript": interview.transcript,
         "evaluations": interview.evaluations,
         "final_report": interview.final_report,
         "created_at": interview.created_at.isoformat()
       }
```

**Security**:
- Only owner can access (user_id check)
- No cross-user access possible

---

## 4. AUTHENTICATION FLOW

### Firebase Integration

**Entry Point**: Every endpoint behind `CurrentUser` dependency

**Flow**:
```
1. Client sends request with Authorization header
   └─> "Authorization: Bearer {firebase_id_token}"

2. FastAPI security middleware intercepts
   └─> Extracts token via HTTPBearer

3. Verify token with Firebase Admin SDK
   ├─> auth.verify_id_token(token)
   ├─> If invalid/expired: Return 401
   └─> Extract: uid, email, name, picture

4. Check if user exists in local DB
   ├─> Query: User.email == token.email
   ├─> If found: Return existing user
   └─> If not found:
       ├─> Try to create new User record (auto-onboarding)
       ├─> Handle race condition (concurrent requests)
       └─> Return user

5. Return User object to endpoint
   └─> Injected via Depends(get_current_user)
```

**Error Cases**:
- Invalid token: 401 Unauthorized
- Token expired: 401 Unauthorized
- Database integrity error on creation: 500 (race condition handled)
- Missing email in token: 401 (invalid token)

---

## 5. LLM INTERACTIONS

### 5.1 OpenAI API Calls

| Function | Model | Temperature | Purpose |
|----------|-------|-------------|---------|
| `extract_cv_info_logic()` | gpt-4o | 0.7 | CV parsing to JSON |
| `generate_question_logic()` | gpt-4o | 0.7 | Interview questions |
| `evaluate_star_logic()` | gpt-4o | 0.2 | STAR evaluation |
| `generate_report_logic()` | gpt-4o | 0.7 | Final feedback report |
| TTS | tts-1-hd | - | Speech synthesis |
| Transcription | whisper-1 | - | Audio to text |

### 5.2 Prompt Engineering

**CV Extraction Prompt**:
```
Phân tích CV sau và trích xuất:
1. Danh sách các kỹ năng chính (skills)
2. Họ và tên (full_name)
3. Ngày tháng năm sinh (dob)
4. Vị trí hiện tại (current_position)

CV: {cv_text}

Trả về kết quả dưới dạng JSON thuần túy.
```

**Interviewer Prompt**:
```
You are a professional Interviewer for a {interview_type} interview.
Current Phase: {current_phase}
This is question number {q_count + 1} of 15.

Context:
- CV: {cv_content}
- JD: {jd_content}
- Skills: {skills_extracted}
- RAG Suggestions: {question_bank}

Guidelines:
1. Respond ONLY in {language}
2. {stress_instruction}  # "BE VERY STRICT" or "Be professional"
3. Keep question concise (max 2 sentences)
4. Current Objective: {phase_objective}

Chat History: {chat_history}
Ask the NEXT question or provide the closing statement.
```

**Evaluator Prompt**:
```
Evaluate the candidate's last response using the STAR Method.

Context:
- Question asked: {last_ai_msg}
- Candidate answer: {last_user_msg}

Provide evaluation in JSON:
- "scores": { "clarity": 1-5, "relevance": 1-5, "technical_depth": 1-5, "confidence": 1-5 }
- "feedback": "Short constructive critique"
- "betterVersion": "A more professional version"

Return ONLY pure JSON.
```

---

## 6. LANGGRAPH ORCHESTRATION

### 6.1 Workflow State Definition

```python
class InterviewState(TypedDict):
    cv_content: str                              # CV text
    jd_content: str                              # Job description
    skills_extracted: list[str]                  # Extracted from CV
    question_bank: str                           # RAG suggestions
    chat_history: Annotated[list[dict], add]    # Accumulates messages
    current_question_count: int                  # 0 to 15
    current_phase: str                           # Interview phase
    interview_type: str                          # Behavioral/Technical
    language: str                                # vi/en
    is_stress_test: bool                         # Difficulty flag
    evaluations: Annotated[list[str], add]      # Accumulates evals
    final_report: str                            # Final feedback
```

**Key Note**: `Annotated[..., operator.add]` means these fields ACCUMULATE (append) rather than replace

### 6.2 Nodes

#### **Node: Profiler**
```
Purpose: Extract CV skills and generate question bank
Input: cv_content
Output:
  - skills_extracted: [...] parsed from CV
  - question_bank: "Câu hỏi liên quan đến: ..."
  - current_phase: "Introduction"

Function: profiler_node()
├─> Call extract_cv_info_logic(cv_content)
├─> Parse JSON → extract skills
├─> Call search_questions_logic(skills) → mock RAG
└─> Return state updates
```

#### **Node: Interviewer**
```
Purpose: Generate the next interview question
Input: current_state (full state)
Output:
  - chat_history: appends {"role": "ai", "content": question}
  - current_phase: moves to next phase
  - current_question_count: increments

Function: interviewer_node()
├─> Call generate_question_logic(MockReq(state))
├─> Receives: ai_text, next_phase, next_count
└─> Update state and return

Phase Logic:
  PHASES = [
    "Introduction",
    "CV Deep-dive",
    "Job-fit Assessment",
    "Behavioral",
    "Motivation",
    "Candidate Questions",
    "Closing"
  ]
  
  - Every 2 questions → phase transition (when count % 2 == 0)
  - At question 13 → force "Closing"
  - At question 15 → end interview
```

#### **Node: Evaluator**
```
Purpose: Evaluate user's answer using STAR method
Input: chat_history with ≥2 messages
Output:
  - evaluations: appends JSON evaluation

Function: evaluator_node()
├─> Check if chat_history has 2+ messages
├─> If yes:
│   ├─> Extract last AI message (question)
│   ├─> Extract last user message (answer)
│   ├─> Call evaluate_star_logic(MockReq)
│   └─> Append evaluation to state
└─> If no: return {}
```

### 6.3 Routing Logic

```python
def route_next(state: InterviewState) -> str:
    """Conditional routing after each node"""
    
    if not state.get("current_phase"):
        # First invocation: no phase set yet
        return "profiler"  → profiler_node()
    
    if state["chat_history"] and state["chat_history"][-1]["role"] == "user":
        # Last message was from user (answer to a question)
        return "evaluator"  → evaluator_node()
    
    # Otherwise (after profiler or evaluator)
    return "interviewer"  → interviewer_node()
```

### 6.4 Workflow Graph

```
START
  │
  └─> route_next() [conditional edge]
      │
      ├─> if no current_phase: profiler_node()
      │   └─> interviewer_node() → END
      │
      ├─> if last_msg.role == "user": evaluator_node()
      │   └─> interviewer_node() → END
      │
      └─> else: interviewer_node() → END
```

### 6.5 Persistence

- **Checkpointer**: MemorySaver (in-memory)
- **Thread ID**: `f"user_{user_id}_{session_id}"`
  - Ensures isolation per user/session
  - Allows resuming conversation
  - Prevents cross-user state leakage

### 6.6 Retry Policy

```python
retry_policy = {"max_attempts": 3}
```
- Applied to all nodes
- Handles transient API failures
- Max 3 retries per node invocation

---

## 7. DECISION POINTS & BRANCHING LOGIC

### 7.1 Authentication Check
| Endpoint | Required | Failure | 
|----------|----------|---------|
| All endpoints | ✓ CurrentUser | 401 Unauthorized |
| /transcribe | Optional | Continue anyway |

### 7.2 Onboarding Gate
| Endpoint | Check | Failure |
|----------|-------|---------|
| /interview/start | is_onboarded == True | 403 "Onboarding required" |
| /interview/start | is_onboarded == True | 403 "Upload CV" |
| /history | is_onboarded == True | 403 "Onboarding required" |
| /user/onboard | None | Auto-completes |
| /user/profile | None | Always accessible |

### 7.3 Session Validation
| Check | Endpoint | Failure |
|-------|----------|---------|
| Interview exists | /start, /chat, /end | 404 Not Found |
| Belongs to user | /start, /history/{id} | 404 (security isolation) |

### 7.4 Interview Phase Progression

**Decision**: When does interview progress to next phase?

```
Condition: Every 2 questions (when question_count % 2 == 0) AND count < 13

Phases:
  Q1          → "Introduction"
  Q2          → [phase transition] → "CV Deep-dive"
  Q3-4        → "CV Deep-dive"
  Q4          → [transition] → "Job-fit Assessment"
  Q5-6        → "Job-fit Assessment"
  Q6          → [transition] → "Behavioral"
  Q7-8        → "Behavioral"
  Q8          → [transition] → "Motivation"
  Q9-10       → "Motivation"
  Q10         → [transition] → "Candidate Questions"
  Q11-12      → "Candidate Questions"
  Q13+        → [FORCE] → "Closing"
  Q15         → END
```

### 7.5 Stress Test Mode

**Flag**: `is_stress_test: bool`

**Impact on Interviewer Prompt**:
```
if is_stress_test == True:
  stress_instruction = "BE VERY STRICT, CHALLENGING, and probing"
else:
  stress_instruction = "Be professional, polite, and encouraging"
```

**Currently**: Hardcoded to `False` in /start endpoint (TODO: pass from frontend)

### 7.6 Language Support

**Supported**: Vietnamese ("vi") and English ("en")

**Impact**:
- CV extraction prompt translated
- Interviewer questions generated in target language
- Evaluations in target language
- Final report in target language

---

## 8. DATA FLOW DIAGRAM

```
Frontend
  │
  ├─────────────────────────────────────────────────────┐
  │                                                       │
  ├─ POST /api/v1/user/onboard                          │
  │   ├─> Firebase Auth ─┐                              │
  │   ├─> Extract CV ────┼─> LLM (gpt-4o)              │
  │   └─> Save to DB ────┤                              │
  │                       └─> Return skills             │
  │                                                       │
  ├─ GET /api/v1/user/profile                           │
  │   └─> Query DB ──> Return user info                 │
  │                                                       │
  ├─ POST /api/v1/interview/setup                       │
  │   ├─> Firebase Auth                                 │
  │   ├─> Generate questions ─> LLM (gpt-4o)           │
  │   └─> Save Interview ──────> Database               │
  │                                                       │
  ├─ POST /api/v1/interview/transcribe                  │
  │   ├─> Write temp file                              │
  │   ├─> Call Whisper API ──────> Audio to text        │
  │   └─> Delete temp file                              │
  │                                                       │
  ├─ POST /api/v1/interview/start                       │
  │   ├─> Firebase Auth + Onboarding check             │
  │   ├─> Fetch Interview from DB                      │
  │   ├─> Init LangGraph state                         │
  │   └─> app_graph.ainvoke(state) ──┐                │
  │       ├─> Profiler node          │                │
  │       │   └─> LLM for CV skills  │                │
  │       └─> Interviewer node       │                │
  │           └─> LLM for question   │                │
  │                                   └─ Return first question         │
  │   ├─> Generate TTS ──────────────> OpenAI TTS API │
  │   └─> Return: question + audio                      │
  │                                                       │
  ├─ POST /api/v1/interview/chat                        │
  │   ├─> Firebase Auth                                 │
  │   ├─> app_graph.ainvoke(user_message) ──┐          │
  │   │   ├─> Evaluator node (if ≥2 msgs) │          │
  │   │   │   └─> LLM STAR evaluation    │          │
  │   │   └─> Interviewer node          │          │
  │   │       └─> LLM next question     │          │
  │   │                                  └─ Return evaluations, next_q │
  │   ├─> Generate TTS                                 │
  │   └─> Return: reply + evaluations + audio          │
  │                                                       │
  ├─ POST /api/v1/interview/end                         │
  │   ├─> Firebase Auth                                 │
  │   ├─> Generate report ────────────> LLM (gpt-4o)   │
  │   ├─> Save Interview to DB                         │
  │   ├─> Generate TTS for feedback                     │
  │   └─> Return: report + audio                        │
  │                                                       │
  ├─ GET /api/v1/history                                │
  │   ├─> Firebase Auth + Onboarding check             │
  │   └─> Query DB ─> List interviews                   │
  │                                                       │
  └─ GET /api/v1/history/{id}                           │
      ├─> Firebase Auth + Ownership check               │
      └─> Query DB ─> Return interview detail           │
```

---

## 9. ERROR HANDLING & EDGE CASES

### 9.1 Common Error Scenarios

| Scenario | Status | Detail | Recovery |
|----------|--------|--------|----------|
| No valid token | 401 | "Could not validate credentials" | User must re-authenticate |
| Token expired | 401 | "Could not validate credentials" | User must re-authenticate |
| User not onboarded on /start | 403 | "Tài khoản chưa hoàn thành Onboarding" | User must /onboard first |
| Interview not found | 404 | "Session not found" | User must /setup to create |
| Concurrent user creation | 500 then resolve | Race condition handled | System auto-resolves |
| CV extraction fails | 500 | Error detail | Fallback to generic skills |
| LLM API timeout | 500 | "LLM service error" | Retry up to 3 times |
| Audio file too large | 413 | Implicit from FastAPI | User reduce file size |
| Invalid JSON response from LLM | 500 | Parse error | Fallback response |

### 9.2 Edge Cases

**Empty Chat History in Evaluator**:
- If < 2 messages: Evaluator returns `{}`
- Interview continues without evaluation

**Stress Test Not Passed from Frontend**:
- Currently hardcoded to `False` in /start
- TODO: Accept from /start endpoint parameter

**Browser Close Mid-Interview**:
- LangGraph thread_id persists in memory
- Frontend can resume by re-calling /start with same session_id
- State recovers from MemorySaver checkpoint

**User Tries to Access Another User's Interview**:
- Query includes `Interview.user_id == current_user.id`
- Returns 404 if mismatch (no error message leakage)

---

## 10. API SEQUENCE DIAGRAMS

### Typical Interview Flow

```
STEP 1: SETUP
┌─────────┐                                       ┌─────────┐
│ Client  │                                       │ Backend │
└─────────┘                                       └─────────┘
    │                                                 │
    │ 1. POST /user/onboard (CV)                    │
    ├────────────────────────────────────────────> │
    │                                                 │ Auth + Extract CV
    │ 2. 200 OK {skills, user_id}                    │ Save to DB
    │ <───────────────────────────────────────────────│
    │                                                 │
    │ 3. POST /interview/setup (CV, JD)             │
    ├────────────────────────────────────────────> │
    │                                                 │ Analyze + Generate Qs
    │ 4. 200 OK {session_id, predicted_questions}  │ Save Interview
    │ <───────────────────────────────────────────────│
    │                                                 │

STEP 2: START INTERVIEW
    │ 5. POST /interview/start?session_id=1         │
    ├────────────────────────────────────────────> │
    │                                                 │ LangGraph workflow:
    │                                                 │ ├─ route_next() → profiler
    │                                                 │ ├─ profiler_node()
    │                                                 │ ├─ interviewer_node()
    │                                                 │ └─ Get first question
    │                                                 │
    │                                                 │ TTS first question
    │                                                 │
    │ 6. 200 OK {first_question, audio_base64}      │
    │ <───────────────────────────────────────────────│
    │                                                 │

STEP 3: CONVERSATION LOOP
    │ 7. POST /interview/chat (message)             │
    ├────────────────────────────────────────────> │
    │                                                 │ LangGraph workflow:
    │                                                 │ ├─ route_next() → evaluator
    │                                                 │ ├─ evaluator_node()
    │                                                 │ ├─ route_next() → interviewer
    │                                                 │ ├─ interviewer_node()
    │                                                 │ └─ Evaluate + Next question
    │                                                 │
    │                                                 │ TTS reply
    │                                                 │
    │ 8. 200 OK {reply, evaluations, audio_base64}  │
    │ <───────────────────────────────────────────────│
    │                                                 │
    │ [REPEAT 7-8 until current_phase == "Closing"] │
    │                                                 │

STEP 4: END INTERVIEW
    │ 9. POST /interview/end (history, evals)       │
    ├────────────────────────────────────────────> │
    │                                                 │ Generate final report
    │                                                 │ Save Interview (completed)
    │                                                 │ TTS feedback
    │                                                 │
    │ 10. 200 OK {feedback, audio_base64}           │
    │ <───────────────────────────────────────────────│
    │                                                 │

STEP 5: HISTORY
    │ 11. GET /history                              │
    ├────────────────────────────────────────────> │
    │                                                 │ Query user's interviews
    │ 12. 200 OK [{id, type, date, score, lang}]   │
    │ <───────────────────────────────────────────────│
    │                                                 │
    │ 13. GET /history/1                            │
    ├────────────────────────────────────────────> │
    │                                                 │ Query specific interview
    │ 14. 200 OK {full interview details}           │
    │ <───────────────────────────────────────────────│
```

---

## 11. CONFIGURATION & DEPENDENCIES

### Environment Variables
```
OPENAI_API_KEY=sk-xxxxx        # OpenAI API key
DATABASE_URL=postgresql://...  # SQLAlchemy DB URL
FIREBASE_...=...               # Firebase config (optional, can use defaults)
```

### Python Dependencies
```
fastapi>=0.115.0
uvicorn>=0.30.0
sqlalchemy>=2.0.0
pydantic>=2.0.0
firebase-admin>=6.0.0
openai>=1.50.0
langchain>=0.3.0
langgraph>=0.2.0
```

### Startup Flow
1. **main.py**: `FastAPI()` app initialization
2. **Middleware**: CORS enabled for all origins
3. **Router**: Include `/api/v1` endpoints
4. **Startup Event**: `init_db()` initializes SQLAlchemy tables
5. **Server**: Uvicorn runs on `127.0.0.1:8000`

---

## 12. PERFORMANCE & SCALABILITY NOTES

### Current Limitations

1. **In-memory State**: MemorySaver (LangGraph) stores state in memory
   - Doesn't survive process restart
   - **Fix**: Switch to PostgreSQL persistor

2. **Synchronous DB**: SQLAlchemy ORM used in async context
   - May cause blocking
   - **Fix**: Use async SQLAlchemy or async driver

3. **Single-process**: Uvicorn default single-worker
   - Can't handle high concurrency
   - **Fix**: Run with gunicorn + multiple workers

4. **TTS Latency**: Each response calls OpenAI TTS API
   - ~1-2 second overhead per question
   - **Fix**: Stream audio while text is being generated

5. **LLM Latency**: Each question/evaluation calls OpenAI
   - ~2-5 seconds per call (network + processing)
   - **Fix**: Implement caching, use faster models

### Recommended Improvements

- [ ] Switch to PostgreSQL for state persistence
- [ ] Use async SQLAlchemy for non-blocking DB calls
- [ ] Implement Redis caching for LLM responses
- [ ] Add request rate limiting
- [ ] Implement request queueing for high load
- [ ] Add monitoring & logging for LLM calls
- [ ] Use streaming audio from TTS API
- [ ] Add APM (application performance monitoring)

---

## 13. SECURITY ANALYSIS

### Authentication
✓ Firebase token verification required for all endpoints  
✓ Local user record creation with race condition handling  
✓ CurrentUser injected via dependency

### Authorization
✓ User can only access own interviews (user_id check)  
✓ Onboarding gate prevents data access  
✓ Thread_id isolation in LangGraph (user_{user_id}_{session_id})

### Data Protection
✓ CORS enabled (allows all origins - consider restricting)  
✓ HTTP Bearer token validation  
✓ No sensitive data in logs  
✗ Missing HTTPS enforcement (should be at reverse proxy level)

### Input Validation
✓ Pydantic models validate all request bodies  
✓ Path parameters validated (interview_id as int)  
✓ File upload handled with temp file cleanup

### Potential Vulnerabilities
- **CORS too permissive**: `allow_origins=["*"]` should be restricted to frontend domain
- **Missing rate limiting**: No protection against brute force / DoS
- **Temp file cleanup**: Could fail if exception before unlink (partially addressed)
- **Direct SQL**: Using SQLAlchemy ORM properly prevents SQL injection

---

## 14. QUICK REFERENCE

### Key Files
- [main.py](../app/main.py) - App initialization
- [api.py](../app/api/v1/api.py) - Router setup
- [interview.py](../app/api/v1/endpoints/interview.py) - Core endpoints
- [graph.py](../app/services/graph.py) - LangGraph workflow
- [models.py](../app/models/models.py) - DB schemas

### Endpoint Summary
| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/v1/user/onboard | Onboard user |
| GET | /api/v1/user/profile | Get profile |
| POST | /api/v1/interview/setup | Create session |
| POST | /api/v1/interview/start | Begin interview |
| POST | /api/v1/interview/chat | Continue interview |
| POST | /api/v1/interview/transcribe | Convert audio |
| POST | /api/v1/interview/end | Finalize interview |
| GET | /api/v1/history | List interviews |
| GET | /api/v1/history/{id} | Get interview detail |

---

## 15. CONCLUSION

The backend architecture follows a **modular, event-driven design** with:
- Clear separation of concerns (endpoints, services, models)
- LangGraph orchestration for complex interview workflow
- Firebase authentication for security
- Multiple LLM integrations for different tasks
- Database persistence for user & interview data

The flow supports a complete interview lifecycle: user onboarding → session setup → interactive conversation with evaluations → final report generation → history tracking.

The system is primed for scaling with proper DevOpsing (containerization, load balancing, state persistence improvements).
