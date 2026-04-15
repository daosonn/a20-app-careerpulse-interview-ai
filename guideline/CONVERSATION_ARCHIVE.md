# Conversation Archive - AI Interviewer System Analysis

**Date**: April 15, 2026  
**Topic**: System Architecture Analysis - Backend & Frontend

---

## 📝 User Request

**Vietnamese (Original):**
> đọc thư mục backend và frontend. phác thảo lại kiến trúc hệ thống frontend và backend. Nêu ra các agent-service chạy ở port nào, các page- thành phần frontend gọi các api gì, đến đâu. Giari thích rõ luồng hoạt động

**English Translation:**
> Read the backend and frontend directories. Sketch the architecture of the frontend and backend systems. Point out which agent-services run on which ports, which pages-components call which APIs, and to where. Explain the workflow clearly.

---

## 📊 Analysis Summary

### Services & Ports

| Service | Port | Framework | Description |
|---------|------|-----------|-------------|
| **FastAPI Backend** | **8000** | FastAPI + Uvicorn | Main API, request handling |
| **React Frontend** | **3000** | Vite Dev Server | UI, routing, components |
| **LangGraph Agent** | (In-process) | LangGraph | Interview orchestration |
| **OpenAI API** | - | External | LLM, Whisper, TTS |

### Core API Endpoints (Backend Port 8000)

```
Base URL: http://127.0.0.1:8000/api/v1

INTERVIEW MANAGEMENT:
├── POST /interview/setup      ← Initialize interview session
├── POST /interview/start      ← Start interview, generate first question
├── POST /interview/chat       ← Chat/Q&A during interview
├── POST /interview/end        ← End interview, generate report
└── POST /interview/transcribe ← Audio transcription (Whisper)

SESSION HISTORY:
├── GET /history/              ← Get all sessions (user's)
└── GET /history/{interview_id} ← Get session details

USER MANAGEMENT:
├── POST /user/onboard         ← CV upload & onboarding
└── GET /user/profile          ← Get user profile
```

### Frontend Pages & Components (Port 3000)

```
src/features/

1. auth/
   └── Login.tsx → Google OAuth sign-in
   └── AuthContext.tsx → JWT token management + authenticatedFetch()

2. landing/
   └── Landing.tsx → Home page

3. onboarding/
   └── Onboarding.tsx → CV upload & profile setup
       → POST /api/v1/user/onboard

4. dashboard/
   └── Dashboard.tsx → Session list overview
       → GET /api/v1/history/

5. session/
   ├── SetupSession.tsx → Interview configuration
   │   → Input: CV, JD, interview type, language
   │   → POST /api/v1/interview/setup
   │
   ├── InterviewRoom.tsx → Live chat interface
   │   → POST /api/v1/interview/start
   │   → POST /api/v1/interview/chat (loop)
   │   → POST /api/v1/interview/transcribe
   │   → POST /api/v1/interview/end
   │
   └── SessionDetail.tsx → Results summary
       → GET /api/v1/history/{id}

6. profile/
   └── Profile.tsx → User profile view
```

### Custom Hooks (Frontend)

```
src/features/session/hooks/

1. useInterviewSession() 
   - Manages interview state & API calls
   - Calls: /interview/start, /interview/chat, /interview/end

2. useAudioRecorder()
   - Records user audio answers

3. useSpeech()
   - Text-to-speech playback
   - Uses OpenAI TTS API

4. useAuth()
   - Manages Firebase authentication
   - Injects JWT tokens
```

---

## 🔄 Interview Workflow (Detailed)

### Phase 1: Setup

```
User: Landing → Login → Onboarding
├─ Upload CV
├─ POST /api/v1/user/onboard
└─ Backend:
   - Extract skills, full name, DOB, position
   - Update user profile (is_onboarded = true)

User: Navigate to Dashboard
├─ GET /api/v1/history/ (list past sessions)
└─ Click "New Interview"

User: Setup Page (SetupSession.tsx)
├─ Select CV (or use from profile)
├─ Input Job Description (text)
├─ Select Interview Type (Behavioral/Technical/HR)
├─ Select Language (Vietnamese/English)
├─ [Stress Test checkbox - optional]
└─ Click Submit

SetupSession.tsx:
├─ POST /api/v1/interview/setup
│  {
│    "cv_text": "...",
│    "jd_text": "...",
│    "interview_type": "Behavioral",
│    "language": "vi",
│    "is_stress_test": false
│  }
└─ Backend Response:
   {
     "session_id": 123,
     "predicted_questions": [...]
   }

Navigate to: /session/{session_id}
```

### Phase 2: Interview Starts

```
InterviewRoom.tsx Loads:
├─ useInterviewSession() hook initializes
├─ GET /api/v1/history/{session_id}
│  └─ Load existing session data
└─ POST /api/v1/interview/start?session_id={session_id}
   
Backend Processing:
├─ Initialize LangGraph State:
│  {
│    "cv_content": "...",
│    "jd_content": "...",
│    "chat_history": [],
│    "current_question_count": 0,
│    "interview_type": "Behavioral",
│    "language": "vi",
│    "is_stress_test": false,
│    "current_phase": None,
│    "skills_extracted": [],
│    "question_bank": "",
│    "evaluations": [],
│    "final_report": ""
│  }
│
├─ Run LangGraph Workflow:
│  1. Profiler Node:
│     - extract_cv_info_logic() → Extract skills
│     - search_questions_logic() → Create question bank
│  
│  2. Interviewer Node:
│     - generate_question_logic() → GPT-4o (temp:0.7)
│     - generate_speech_base64() → OpenAI TTS
│
└─ Response:
   {
     "first_question": "Tell me about your React experience...",
     "audio_base64": "...",
     "current_phase": "Introduction",
     "skills_extracted": ["React", "Python", ...],
     "question_bank": "..."
   }

Frontend Display:
├─ useSpeech() → Play audio TTS
├─ Display question text in chat
└─ Wait for user answer
```

### Phase 3: Interview Chat Loop

```
FOR EACH TURN (3-5 times):

User Records Answer:
├─ useAudioRecorder() → Captures audio blob
└─ [User clicks "Submit Answer"]

Transcribe Audio:
├─ POST /api/v1/interview/transcribe
│  {
│    "file": audioBlob
│  }
└─ Whisper API → Returns transcribed text
   {
     "text": "I have 5 years of experience..."
   }

Submit Answer to Backend:
├─ POST /api/v1/interview/chat
│  {
│    "message": "I have 5 years of experience...",
│    "session_id": 123
│  }
│
└─ Backend Workflow:
   
   1. Add user message to chat_history
   2. Call app_graph.ainvoke() with routing logic
   
   3. Evaluator Node:
      - evaluate_star_logic() → GPT-4o (temp:0.2)
      - Analyzes: answer quality, relevance, depth
      - Generates: star_rating (1-5), feedback, details
      - Appends evaluation to evaluations list
      - Returns:
        {
          "star": 4,
          "feedback": "Great explanation of React hooks",
          "details": {...}
        }
   
   4. Interviewer Node:
      - generate_question_logic() → GPT-4o (temp:0.7)
      - Generates next question based on:
        * Previous answer quality
        * Current phase (Introduction → Body → Closing)
        * Interview type
        * Skills extracted
      - Generates TTS audio via OpenAI
      - Updates current_phase & question counter
   
   5. Response:
      {
        "reply": "Can you tell me about a time you solved a complex React problem?",
        "evaluations": [
          {
            "star": 4,
            "feedback": "Great explanation of React hooks"
          }
        ],
        "last_evaluation": {...},
        "audio_base64": "...",
        "current_phase": "Body",
        "should_end": false
      }

Frontend Display:
├─ Update chat history (add both user answer + AI question)
├─ Display evaluation card:
│  ├─ Star rating (★★★★☆)
│  └─ Feedback text
├─ useSpeech() → Play next question audio
└─ Wait for next user answer

REPEAT until:
└─ current_phase = "Closing" AND should_end = true
```

### Phase 4: Interview Ends

```
Interview Complete Condition:
├─ Phase reaches "Closing"
├─ AI generates closing question/statement
└─ should_end = true

User Clicks "End Interview" (or automatic):
├─ useInterviewSession() → endSession(history)
├─ POST /api/v1/interview/end
│  {
│    "session_id": 123,
│    "history": [
│      {"role": "user", "content": "..."},
│      {"role": "model", "content": "..."},
│      ...
│    ],
│    "cv_text": "...",
│    "jd_text": "...",
│    "interview_type": "Behavioral",
│    "language": "vi",
│    "evaluations": [
│      {"star": 4, "feedback": "..."},
│      {"star": 5, "feedback": "..."},
│      ...
│    ]
│  }
│
└─ Backend Processing:
   
   1. Reporter Service:
      - generate_report_logic() → GPT-4o
      - Analyzes full conversation
      - Generates comprehensive feedback report
      - Includes: strengths, weaknesses, improvements
      - Language: Same as interview (vi/en)
   
   2. Generate Final Report:
      - "Overall Assessment: ..."
      - "Strengths: ..."
      - "Areas for Improvement: ..."
      - "Recommendations: ..."
   
   3. Update Interview Record:
      - status: "in_progress" → "completed"
      - transcript: Full chat history
      - evaluations: All turn evaluations
      - final_report: Comprehensive feedback
      - score: 85 (hardcoded in demo, can be dynamic)
      - Save to DB
   
   4. Response:
      {
        "feedback": "Overall assessment: You demonstrated strong...",
        "audio_base64": "..."
      }

Frontend:
├─ useSpeech() → Play final report audio
├─ Display final report text
└─ Navigate: /session/{session_id}/summary
```

### Phase 5: Review Results

```
SessionDetail.tsx:
├─ GET /api/v1/history/{interview_id}
│  
└─ Response:
   {
     "id": 123,
     "interview_type": "Technical",
     "language": "vi",
     "cv_text": "...",
     "jd_text": "...",
     "transcript": [
       {"role": "model", "content": "Question 1..."},
       {"role": "user", "content": "Answer 1..."},
       {"role": "model", "content": "Question 2..."},
       {"role": "user", "content": "Answer 2..."},
       ...
     ],
     "evaluations": [
       {"star": 4, "feedback": "Great answer"},
       {"star": 5, "feedback": "Excellent knowledge"},
       ...
     ],
     "final_report": "Comprehensive report text...",
     "score": 85,
     "created_at": "2026-04-15T10:30:00",
     "status": "completed"
   }

Frontend Display:
├─ Interview header (type, language, date, score)
├─ Full transcript
│  ├─ Q2 by AI
│  ├─ A1 by User
│  ├─ Q2 by AI
│  ├─ A2 by User
│  └─ ...
├─ Evaluation cards (each turn)
│  └─ Star rating + feedback
└─ Final report section
```

---

## 🔐 Authentication & Security

### OAuth Flow
```
1. User clicks "Login with Google"
2. Firebase redirects to Google OAuth
3. Google returns ID token
4. Firebase caches token locally
5. Every API request includes JWT:
   
   Authorization: Bearer {Firebase_JWT_Token}
```

### Secure Fetch Pattern (AuthContext)
```typescript
authenticatedFetch = async (url, options) => {
  const token = await user.getIdToken();  // Get Firebase JWT
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  
  return fetch(url, { ...options, headers });
};

// Usage: await authenticatedFetch('http://127.0.0.1:8000/api/v1/...');
```

### Backend Verification
```python
# FastAPI dependency in auth.py
async def CurrentUser(token: str = Depends(HTTPBearer())):
    # Verify Firebase JWT
    decoded = firebase_admin.auth.verify_id_token(token.credentials)
    user_id = decoded['uid']
    # Get user from DB
    user = db.query(User).filter(User.id == user_id).first()
    return user
```

---

## 📁 Key Files & Locations

### Backend
```
backend/
├── app/
│   ├── main.py                      ← FastAPI app + CORS + startup
│   ├── api/v1/
│   │   ├── api.py                  ← Router registration
│   │   └── endpoints/
│   │       ├── interview.py        ← /interview endpoints
│   │       ├── history.py          ← /history endpoints
│   │       └── user.py             ← /user endpoints
│   │
│   ├── services/
│   │   ├── graph.py                ← LangGraph workflow
│   │   ├── profiler.py             ← CV extraction
│   │   ├── interviewer.py          ← Question generation
│   │   ├── evaluator.py            ← Answer evaluation
│   │   ├── reporter.py             ← Final report
│   │   └── state.py                ← Interview state schema
│   │
│   ├── models/
│   │   └── models.py               ← SQLAlchemy models (User, Interview)
│   │
│   ├── schemas/
│   │   ├── interview.py            ← SetupReq, ChatReq schemas
│   │   └── user.py                 ← OnboardReq schema
│   │
│   └── core/
│       ├── config.py               ← LLM configuration
│       ├── auth.py                 ← Firebase JWT verification
│       └── database.py             ← SQLAlchemy setup
│
├── requirements.txt
└── .env                             ← API keys (OPENAI_API_KEY)
```

### Frontend
```
frontend/src/
├── App.tsx                          ← Main routing + Auth wrapper
│
├── components/
│   ├── Layout.tsx                  ← Main layout with nav
│   └── ErrorBoundary.tsx

├── features/
│   ├── auth/
│   │   ├── context/AuthContext.tsx ← Firebase auth + authenticatedFetch()
│   │   └── components/Login.tsx
│   │
│   ├── landing/
│   │   └── components/Landing.tsx
│   │
│   ├── onboarding/
│   │   └── components/Onboarding.tsx → POST /user/onboard
│   │
│   ├── dashboard/
│   │   ├── components/Dashboard.tsx → GET /history/
│   │   └── hooks/useDashboardData.ts
│   │
│   ├── session/
│   │   ├── components/
│   │   │   ├── SetupSession.tsx    → POST /interview/setup
│   │   │   ├── InterviewRoom.tsx   → /start, /chat, /end
│   │   │   └── SessionDetail.tsx   → GET /history/{id}
│   │   │
│   │   └── hooks/
│   │       ├── useInterviewSession.ts → State management
│   │       ├── useAudioRecorder.ts   → Audio recording
│   │       └── useSpeech.ts         → Text-to-speech
│   │
│   └── profile/
│       └── components/Profile.tsx
│
├── lib/
│   ├── firebase.ts                  ← Firebase config
│   └── fileParser.ts               ← PDF/DOC parsing
│
└── main.tsx                         ← React entry point
```

---

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI (async Python web framework)
- **AI Orchestration**: LangGraph (graph-based state machine)
- **ORM**: SQLAlchemy (relational database)
- **Database**: SQLite/PostgreSQL
- **LLM**: OpenAI APIs (GPT-4o, Whisper, TTS)
- **Server**: Uvicorn (ASGI server)

### Frontend
- **Framework**: React 19 (modern hooks + Suspense)
- **Language**: TypeScript 5.8
- **Build**: Vite 6 (fast dev server & bundler)
- **Styling**: Tailwind CSS 4
- **Routing**: React Router v7
- **State**: Context API + Custom Hooks
- **Auth**: Firebase SDK + Google OAuth
- **Charts**: Recharts (data visualization)
- **Icons**: Lucide React
- **File Parsing**: pdfjs-dist + mammoth (client-side)

### External Services
- **Firebase**: Authentication + Firestore
- **OpenAI**: GPT-4o, Whisper (speech-to-text), TTS (text-to-speech)

---

## 📊 Data Models

### User
```json
{
  "id": number,
  "email": "string (unique)",
  "name": "string",
  "avatar": "string (URL)",
  "cv_text": "text (full CV content)",
  "skills": ["string", "..."],
  "is_onboarded": boolean,
  "full_name": "string",
  "dob": "string (date)",
  "current_position": "string"
}
```

### Interview
```json
{
  "id": number,
  "user_id": number (FK to users),
  "cv_text": "text",
  "jd_text": "text",
  "interview_type": "Behavioral | Technical | HR",
  "language": "vi | en",
  "transcript": [
    {"role": "model", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "evaluations": [
    {"star": 4, "feedback": "..."},
    {"star": 5, "feedback": "..."}
  ],
  "final_report": "text",
  "score": 85,
  "status": "setup | in_progress | completed",
  "predicted_questions": ["Q1", "Q2", "..."],
  "created_at": "ISO timestamp"
}
```

---

## ✨ Key Insights

✅ **Full Stack Async**: Both Frontend (React 19) & Backend (FastAPI) optimized  
✅ **Stateful Interviews**: LangGraph maintains conversation context across requests  
✅ **Secure**: JWT tokens on every API request  
✅ **Modular Services**: Profiler → Interviewer → Evaluator → Reporter pipeline  
✅ **Real-time Ready**: Firebase Firestore for instant updates  
✅ **Intelligent Routing**: Conditional edges based on interview phase  
✅ **Multi-language**: Supports Vietnamese & English  
✅ **Audio Support**: Speech-to-text (Whisper) + Text-to-speech (TTS)  

---

## 📝 Interview Workflow Summary (One Diagram)

```
START
 ↓
Landing → Login → Onboarding
 ↓
Dashboard → SetupSession
 ↓
POST /interview/setup (Create session)
 ↓
POST /interview/start (Profiler + Interviewer → Q1)
 ↓
[Interview Chat Loop - 3-5 times]
├─ POST /interview/transcribe (Whisper)
├─ POST /interview/chat (Evaluator + Interviewer)
│  ├─ Evaluator: Rate answer (1-5 stars)
│  └─ Interviewer: Generate next question
└─ Display evaluation + play audio
 ↓
Phase = "Closing" ?
├─ Yes → POST /interview/end (Reporter → Final report)
└─ No → Loop again
 ↓
Navigate → /session/{id}/summary
 ↓
GET /history/{id} (View full results)
 ↓
END
```

---

## 🔗 Document References

- **SYSTEM_ARCHITECTURE.md** - Full technical architecture (created)
- **API_REFERENCE.md** - API endpoint specifications (created)
- Backend: `backend/requirements.txt` - Python dependencies
- Frontend: `frontend/package.json` - npm dependencies

