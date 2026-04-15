# 🏗️ Kiến Trúc Hệ Thống AI Interviewer

## 📋 Tóm Tắt

Hệ thống là một ứng dụng phỏng vấn AI toàn diện với:
- **Backend**: FastAPI + LangGraph (port 8000)
- **Frontend**: React 19 + TypeScript + Vite (port 3000)
- **Authentication**: Firebase
- **Database**: Firestore + SQLAlchemy (backend)
- **AI/LLM**: OpenAI (GPT-4, Whisper, TTS)

---

## 🖥️ BACKEND ARCHITECTURE

### 1. **Services & Ports**

| Service | Port | Framework | Mô tả |
|---------|------|-----------|-------|
| **FastAPI Server** | **8000** | FastAPI + Uvicorn | API chính, xử lý request |
| **LangGraph Agent** | (In-process) | LangGraph | Orchestration phỏng vấn |
| **OpenAI API** | - | External | LLM, Whisper, TTS |

**Khởi động Backend:**
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. **API Endpoints Structure**

```
Base URL: http://127.0.0.1:8000/api/v1

├── /interview (Interview Management)
│   ├── POST /setup            ← Khởi tạo phiên phỏng vấn
│   ├── POST /start            ← Bắt đầu interview
│   ├── POST /chat             ← Chat/Q&A trong interview
│   ├── POST /end              ← Kết thúc interview + report
│   ├── POST /transcribe       ← Demo: Transcribe audio
│
├── /history (Session History)
│   ├── GET /                  ← Lấy danh sách tất cả sessions
│   ├── GET /{interview_id}    ← Chi tiết từng session
│
└── /user (User Management)
    ├── POST /onboard          ← CV upload & onboarding
    └── GET /profile           ← Lấy profile người dùng
```

---

## 📡 API ENDPOINTS - CHI TIẾT

### **A. Interview Endpoints**

#### **1. POST /api/v1/interview/setup**
```
Mục đích: Khởi tạo phiên phỏng vấn, phân tích CV & JD, sinh câu hỏi dự đoán

Request:
{
  "cv_text": "string (CV content)",
  "jd_text": "string (Job Description)",
  "interview_type": "Behavioral | Technical | HR",
  "language": "vi | en",
  "is_stress_test": boolean
}

Response:
{
  "session_id": number,
  "predicted_questions": [...]
}

Gọi từ: SetupSession.tsx → handleSubmit()
```

#### **2. POST /api/v1/interview/start**
```
Mục đích: Bắt đầu interview, tạo first question, init LangGraph state

Request:
?session_id={id}

Response:
{
  "first_question": "string",
  "audio_base64": "base64 encoded audio",
  "current_phase": "Introduction | Body | Closing",
  "skills_extracted": [...],
  "question_bank": "..."
}

Workflow:
1. Load Interview từ DB
2. Init LangGraph state (CV, JD, empty history)
3. Call app_graph.ainvoke() → Profiler Node
4. Return first question + TTS audio

Gọi từ: useInterviewSession.tsx → loadData()
```

#### **3. POST /api/v1/interview/chat**
```
Mục đích: User gửi trả lời, AI phản hồi, evaluate

Request:
{
  "message": "string (user answer)",
  "session_id": number
}

Response:
{
  "reply": "string (AI question)",
  "evaluations": [...],
  "last_evaluation": {...},
  "audio_base64": "...",
  "current_phase": "...",
  "should_end": boolean
}

Workflow:
1. Add user message to chat_history
2. Call app_graph.ainvoke() with routing:
   - USER → EVALUATOR node
   - EVALUATOR → INTERVIEWER node
3. Evaluator scores answer (star rating, feedback)
4. Interviewer generates next question
5. Check phase → return should_end flag

Gọi từ: InterviewRoom.tsx → submitAnswer()
```

#### **4. POST /api/v1/interview/end**
```
Mục đích: Kết thúc interview, sinh final report, lưu session

Request:
{
  "session_id": number,
  "history": [{role, content}, ...],
  "cv_text": "...",
  "jd_text": "...",
  "interview_type": "...",
  "language": "...",
  "evaluations": [...]
}

Response:
{
  "feedback": "string (final report)",
  "audio_base64": "..."
}

Workflow:
1. Call generate_report_logic() → Reporter service
2. Create new Interview record (status: completed)
3. Save transcript, evaluations, final_report
4. Assign score (85)
5. Return feedback text + TTS

Gọi từ: InterviewRoom.tsx → endSession()
```

#### **5. POST /api/v1/interview/transcribe** (Demo)
```
Mục đích: Transcribe audio file using Whisper

Request: FormData { file: AudioFile }
Response: { text: "transcribed text" }
```

### **B. History Endpoints**

#### **GET /api/v1/history/**
```
Mục đích: Lấy tất cả sessions của user (sorted by created_at)

Response:
[
  {
    "id": number,
    "interview_type": "string",
    "created_at": "ISO timestamp",
    "score": number,
    "language": "string"
  },
  ...
]

Gọi từ: useDashboardData.tsx (Firestore, but also synced via this)
```

#### **GET /api/v1/history/{interview_id}**
```
Mục đích: Lấy chi tiết session (CV, JD, transcript, evaluations, report)

Response:
{
  "id": number,
  "cv_text": "...",
  "jd_text": "...",
  "interview_type": "...",
  "language": "...",
  "transcript": [{role, content}, ...],
  "evaluations": [...],
  "final_report": "...",
  "created_at": "..."
}

Gọi từ: useInterviewSession.tsx → loadData()
```

### **C. User Endpoints**

#### **POST /api/v1/user/onboard**
```
Mục đích: Upload CV, extract info, mark user as onboarded

Request:
{
  "cv_text": "string",
  "name": "string"
}

Response:
{
  "status": "success",
  "skills": [...],
  "user_id": number,
  "info": {
    "full_name": "...",
    "skills": [...],
    "dob": "...",
    "current_position": "..."
  }
}

Workflow:
1. Call extract_cv_info_logic() → Profiler service
2. Parse CV → skills, name, DOB, experience
3. Update User record in DB
4. Set is_onboarded = True

Gọi từ: Onboarding.tsx → handleSubmit()
```

#### **GET /api/v1/user/profile**
```
Mục đích: Lấy profile thông tin user

Response:
{
  "onboarded": boolean,
  "cv_text": "...",
  "skills": [...],
  "name": "...",
  "full_name": "...",
  "dob": "...",
  "current_position": "..."
}

Gọi từ: AuthContext.tsx → fetchProfile()
```

---

## 🔄 BACKEND SERVICES & WORKFLOW

### **1. LangGraph Agent Flow (app_graph)**

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERVIEW GRAPH WORKFLOW                  │
└─────────────────────────────────────────────────────────────┘

      START
        ↓
    route_next()
        ↓
    ┌───────────────────────────────────────────┐
    │                   PROFILER NODE            │
    │  ├─ extract_cv_info_logic()               │
    │  │  └─ Parse CV → skills, experience     │
    │  └─ search_questions_logic()              │
    │     └─ Create question bank based on     │
    │        skills & interview_type            │
    └───────────────────────────────────────────┘
              ↓
    ┌───────────────────────────────────────────┐
    │               INTERVIEWER NODE             │
    │  ├─ generate_question_logic()             │
    │  │  ├─ Use GPT-4o (temp: 0.7)           │
    │  │  ├─ Generate contextual question      │
    │  │  ├─ Update current_phase              │
    │  │  └─ Increment question counter        │
    │  └─ generate_speech_base64()             │
    │     └─ Text-to-Speech (OpenAI TTS)      │
    └───────────────────────────────────────────┘
              ↓
         [Wait for User Answer]
              ↓
    ┌───────────────────────────────────────────┐
    │                EVALUATOR NODE              │
    │  ├─ evaluate_star_logic()                 │
    │  │  ├─ Use GPT-4o (temp: 0.2)           │
    │  │  ├─ Analyze last user answer          │
    │  │  ├─ Generate star rating (1-5)        │
    │  │  └─ Provide feedback                  │
    │  └─ Append evaluation to history         │
    └───────────────────────────────────────────┘
              ↓
    route_next() → INTERVIEWER
              ↓
         [Repeat Until]
         current_phase = "Closing"
              ↓
             END
```

### **2. Service Layers**

```
backend/app/services/
├── graph.py              ← LangGraph orchestration
├── profiler.py           ← CV parsing, skill extraction
│   └─ extract_cv_info_logic()
│   └─ search_questions_logic()
├── interviewer.py        ← Question generation
│   └─ generate_question_logic()
├── evaluator.py          ← Answer evaluation
│   └─ evaluate_star_logic()
├── reporter.py           ← Final report generation
│   └─ generate_report_logic()
└── state.py              ← InterviewState schema
```

### **3. Database Models**

```sql
-- users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email VARCHAR UNIQUE,
  name VARCHAR,
  avatar VARCHAR,
  cv_text TEXT,
  skills JSON,
  is_onboarded BOOLEAN DEFAULT FALSE,
  full_name VARCHAR,
  dob VARCHAR,
  current_position VARCHAR
);

-- interviews table  
CREATE TABLE interviews (
  id INTEGER PRIMARY KEY,
  user_id INTEGER FK → users.id,
  cv_text TEXT,
  jd_text TEXT,
  interview_type VARCHAR,
  language VARCHAR,
  transcript JSON,           -- [{role, content}, ...]
  evaluations JSON,          -- [{star, feedback}, ...]
  final_report TEXT,
  score INTEGER DEFAULT 0,
  status VARCHAR,            -- setup, in_progress, completed
  predicted_questions JSON,
  created_at DATETIME
);
```

---

## 🎨 FRONTEND ARCHITECTURE

### **1. Ports & Configuration**

| Property | Value | Mô tả |
|----------|-------|-------|
| **Dev Server Port** | **3000** | Vite dev server |
| **Backend Endpoint** | http://127.0.0.1:8000 | API base URL |
| **Database** | Firestore | Real-time user data |
| **Auth Provider** | Firebase + Google IAM | Authentication |

**Khởi động Frontend:**
```bash
cd frontend
npm install
npm run dev    # Runs on http://127.0.0.1:3000
```

### **2. Project Structure**

```
frontend/src/
│
├── App.tsx                      ← Main routing & Auth wrapper
│
├── components/                  ← Shared components
│   ├── Layout.tsx              ← Main layout with nav
│   ├── ErrorBoundary.tsx       ← Error handling
│   └── FormattedText.tsx
│
├── features/                    ← Feature modules (route-based)
│   │
│   ├── auth/                   ← Authentication
│   │   ├── context/
│   │   │   └── AuthContext.tsx ← Global auth state + authenticatedFetch()
│   │   └── components/
│   │       └── Login.tsx       ← Google sign-in
│   │
│   ├── landing/                ← Home page
│   │   └── components/
│   │       └── Landing.tsx
│   │
│   ├── onboarding/             ← CV upload & profile setup
│   │   └── components/
│   │       └── Onboarding.tsx
│   │
│   ├── dashboard/              ← Session list & overview
│   │   ├── components/
│   │   │   └── Dashboard.tsx
│   │   ├── hooks/
│   │   │   └── useDashboardData.ts ← Fetch history from backend
│   │   └── types/
│   │       └── index.ts
│   │
│   ├── session/                ← Interview workflow
│   │   ├── components/
│   │   │   ├── SetupSession.tsx    ← Initialize interview setup
│   │   │   ├── InterviewRoom.tsx   ← Live chat interface
│   │   │   ├── InterviewHeader.tsx
│   │   │   ├── SessionControls.tsx
│   │   │   ├── SessionDetail.tsx   ← View session summary
│   │   │   ├── EvaluationCard.tsx
│   │   │   └── ChatHistory.tsx
│   │   ├── hooks/
│   │   │   ├── useInterviewSession.ts ← Session state & API calls
│   │   │   ├── useAudioRecorder.ts   ← Audio recording
│   │   │   └── useSpeech.ts        ← Text-to-speech
│   │   └── types/
│   │       └── index.ts
│   │
│   └── profile/                ← User profile
│       └── components/
│           └── Profile.tsx
│
├── lib/                        ← Utilities
│   ├── firebase.ts             ← Firebase config & helpers
│   ├── fileParser.ts           ← PDF/DOC parsing
│   └── utils.ts
│
└── main.tsx                    ← React entry point
```

---

## 📲 FRONTEND - PAGE & COMPONENT FLOW

### **1. Auth Flow**

```
Landing.tsx
  ↓
  [Click "Login"]
  ↓
Login.tsx
  ├─ signInWithGoogle()
  ├─ Firebase Auth + Google IAM
  └─ Create user doc in Firestore
  ↓
AuthContext.tsx
  ├─ onAuthStateChanged()
  ├─ GET /api/v1/user/profile
  └─ Check is_onboarded
  ↓
  ├─ NOT Onboarded → Onboarding.tsx
  └─ Onboarded → Dashboard.tsx
```

### **2. Onboarding Flow**

```
Onboarding.tsx
  ├─ File upload → extractTextFromFile()
  │  └─ Parse PDF/DOC using pdfjs-dist & mammoth
  │
  └─ [Submit CV]
     ↓
     POST /api/v1/user/onboard
     {
       "cv_text": "...",
       "name": "..."
     }
     ↓
     Backend extracts:
     - Full name, DOB, skills, position
     ↓
     AuthContext → refreshProfile()
     ↓
     Navigate → /dashboard
```

### **3. Interview Setup Flow**

```
Dashboard.tsx
  ├─ GET /api/v1/history/      [Load past sessions]
  ├─ Parse Firestore data
  └─ Display session list
  
  [Click "New Interview"]
  ↓
SetupSession.tsx
  ├─ File upload for CV (already filled from onboarding)
  ├─ Input Job Description (text)
  ├─ Select Interview Type (dropdown)
  │  └─ Behavioral / Technical / HR
  ├─ Select Language (dropdown)
  │  └─ Vietnamese / English
  └─ Stress Test checkbox (optional)
  
  [Submit]
  ↓
  POST /api/v1/interview/setup
  {
    "cv_text": "...",
    "jd_text": "...",
    "interview_type": "Behavioral",
    "language": "vi",
    "is_stress_test": false
  }
  ↓
  Backend:
  1. Generate predicted questions
  2. Create Interview record
  3. Return session_id
  ↓
  Navigate → /session/{session_id}
```

### **4. Interview Session Flow**

```
InterviewRoom.tsx
  │
  ├─ useInterviewSession() hook
  │  ├─ GET /api/v1/history/{session_id}  [Load session data]
  │  ├─ Load transcript & evaluations
  │  └─ Display current state
  │
  └─ [Interview Starts]
     ↓
     POST /api/v1/interview/start?session_id={id}
     ↓
     Backend:
     1. Init LangGraph state (CV, JD)
     2. Profiler → Extract skills
     3. Interviewer → Generate first question
     ↓
     Response:
     {
       "first_question": "Tell me about your experience with React...",
       "audio_base64": "...",
       "current_phase": "Introduction"
     }
     ↓
     Frontend:
     1. useSpeech() → TTS playback
     2. Display question in chat
     ↓
     [User Records Answer]
     ↓
     useAudioRecorder() → Blob
     ↓
     POST /api/v1/interview/transcribe
     └─ Whisper transcription
     ↓
     [Submit Answer]
     ↓
     POST /api/v1/interview/chat
     {
       "message": "I have 5 years of experience...",
       "session_id": 123
     }
     ↓
     Backend Workflow:
     1. Add to chat_history
     2. Evaluator Node:
        - Analyze answer
        - Generate star rating (1-5)
        - Provide feedback
     3. Interviewer Node:
        - Generate next question
        - Check phase (Introduction → Body → Closing)
     ↓
     Response:
     {
       "reply": "Great! Can you tell me about a time...",
       "evaluations": [{star: 4, feedback: "great answer"}],
       "audio_base64": "...",
       "current_phase": "Body",
       "should_end": false
     }
     ↓
     Frontend:
     1. Update chat history
     2. Display evaluation card
     3. Play TTS
     4. useSpeech() playback
     ↓
     [Repeat until should_end = true]
     ↓
     [Session Ends]
     ↓
     POST /api/v1/interview/end
     {
       "session_id": 123,
       "history": [{role, content}, ...],
       "evaluations": [...],
       "cv_text": "...",
       "jd_text": "...",
       "interview_type": "Behavioral",
       "language": "vi"
     }
     ↓
     Backend:
     1. Reporter → Generate final report
     2. Save Interview with:
        - transcript
        - evaluations
        - final_report
        - score (85)
        - status: completed
     ↓
     Response:
     {
       "feedback": "Overall, you demonstrated...",
       "audio_base64": "..."
     }
     ↓
     Navigate → /session/{session_id}/summary
```

### **5. Session Detail / Summary Flow**

```
SessionDetail.tsx
  ├─ GET /api/v1/history/{session_id}
  │  └─ Load completed interview data
  │
  └─ Display:
     ├─ Interview type & language
     ├─ Full transcript (Q&A pairs)
     ├─ All evaluations
     │  └─ Star rating + feedback per turn
     └─ Final report & score
```

---

## 🔐 Authentication Flow

### **Secure Request Pattern**

```typescript
// In AuthContext.tsx
authenticatedFetch = async (url, options) => {
  const token = await user.getIdToken();  // Firebase JWT
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  
  return fetch(url, { ...options, headers });
};

// Usage in any component:
const response = await authenticatedFetch(
  'http://127.0.0.1:8000/api/v1/user/profile'
);
```

### **Backend Auth Verification**

```python
# FastAPI dependency
async def CurrentUser(token: str = Depends(HTTPBearer())):
    # Verify Firebase JWT token
    decoded = firebase_admin.auth.verify_id_token(token.credentials)
    user_id = decoded['uid']
    
    # Get from DB or create
    user = db.query(User).filter(User.id == user_id).first()
    return user
```

---

## 📊 Data Flow Diagram

```
┌──────────────┐
│   FRONTEND   │
│  React 19    │
│  (port 3000) │
└──────┬───────┘
       │
       │ HTTP/JSON (authenticatedFetch)
       │ Authorization: Bearer {JWT}
       │
       ↓
┌──────────────────────────────────────────┐
│         BACKEND API (FastAPI)             │
│        (http://127.0.0.1:8000)            │
│                                           │
│  ├─ /interview/setup                     │
│  ├─ /interview/start                     │
│  ├─ /interview/chat                      │
│  ├─ /interview/end                       │
│  ├─ /history/                            │
│  ├─ /history/{id}                        │
│  ├─ /user/onboard                        │
│  └─ /user/profile                        │
└──────┬──────────────────────────────────┘
       │
       ├─ → LangGraph Agent (in-process)
       │      ├─ Profiler Service
       │      ├─ Interviewer Service
       │      └─ Evaluator Service
       │
       ├─ → SQLAlchemy ORM
       │      └─ Database (users, interviews)
       │
       └─ → OpenAI APIs (external)
              ├─ GPT-4o (LLM)
              ├─ Whisper (transcription)
              └─ TTS (text-to-speech)

┌──────────────────────────────────────────┐
│      EXTERNAL SERVICES                   │
├──────────────────────────────────────────┤
│ ├─ Firebase Auth (Google OAuth)          │
│ ├─ Firestore (real-time sync)            │
│ ├─ OpenAI APIs                           │
│ └─ PDF/DOC parsing (browser-side)        │
└──────────────────────────────────────────┘
```

---

## 🚀 Workflow Summary

### **High-Level User Journey**

```
1. User Lands on App
   └─ Landing.tsx

2. Sign In with Google
   └─ Login.tsx → Firebase Auth

3. First-Time Setup: Upload CV
   └─ Onboarding.tsx
      → POST /api/v1/user/onboard
      → Extract skills & info
      → Update profile

4. Create Interview Session
   └─ Dashboard.tsx → SetupSession.tsx
      → Input CV, JD, interview type
      → POST /api/v1/interview/setup
      → Create session record

5. Live Interview
   └─ InterviewRoom.tsx
      → POST /api/v1/interview/start (first question)
      → [Chat Loop: POST /api/v1/interview/chat]
         ├─ User answers
         ├─ Whisper transcription
         ├─ LangGraph evaluates & generates next Q
         └─ Repeat
      → POST /api/v1/interview/end (when done)

6. View Results
   └─ SessionDetail.tsx
      → GET /api/v1/history/{id}
      → Display transcript + evaluations + report

7. Dashboard Overview
   └─ Dashboard.tsx
      → GET /api/v1/history/
      → Show all past sessions
```

---

## 🛠️ Key Technologies

### **Backend Stack**
- **Framework**: FastAPI (async Python)
- **Orchestration**: LangGraph (graph-based state machine)
- **ORM**: SQLAlchemy
- **Database**: SQLite/PostgreSQL + Firestore
- **LLM**: OpenAI (GPT-4o, Whisper, TTS)
- **Server**: Uvicorn

### **Frontend Stack**
- **Framework**: React 19 (functional components + hooks)
- **Language**: TypeScript 5.8
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4
- **Routing**: React Router v7
- **State**: Context API + Custom Hooks
- **Auth**: Firebase Admin SDK
- **Libs**: Recharts (data), Lucide (icons)

### **External Services**
- **Auth**: Firebase + Google OAuth
- **Database**: Firestore (document-oriented) + SQLAlchemy (relational)
- **AI/LLM**: OpenAI (GPT-4, Whisper, TTS)
- **File Parsing**: pdfjs-dist + mammoth (client-side)

---

## 🔧 Configuration Files

### **Backend**
- `backend/requirements.txt` - Python dependencies
- `backend/app/core/config.py` - LLM configuration
- `backend/.env` - API keys (OPENAI_API_KEY, etc.)

### **Frontend**
- `frontend/package.json` - npm dependencies
- `frontend/vite.config.ts` - Vite + env vars
- `frontend/.env` - API keys (GEMINI_API_KEY, etc.)

---

## 📝 Summary Table

| Component | Technology | Port | Purpose |
|-----------|-----------|------|---------|
| Frontend | React 19 + Vite | 3000 | UI, routing, chat |
| Backend | FastAPI + Uvicorn | 8000 | API endpoints |
| State Machine | LangGraph | In-process | Interview orchestration |
| Database | SQLAlchemy + SQLite | - | User, interview records |
| Auth | Firebase + Google | - | Authentication |
| Cloud DB | Firestore | - | Real-time sync |
| LLM | OpenAI APIs | - | GPT-4, Whisper, TTS |

---

## 🎯 Key Insights

✅ **Async First**: Backend uses `async/await` throughout
✅ **Secure**: Firebase JWT tokens on every request
✅ **Scalable**: LangGraph handles complex conversation flow
✅ **Real-time**: Firestore for instant UI updates
✅ **Stateful**: Interview state persisted in DB between sessions
✅ **Modular**: Services separated (Profiler, Interviewer, Evaluator, Reporter)

