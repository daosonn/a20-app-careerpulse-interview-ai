# API Reference Guide

## Base URL
```
http://127.0.0.1:8000/api/v1
```

## Authentication
Tất cả requests đều cần header:
```
Authorization: Bearer {Firebase_JWT_Token}
```

---

## 1️⃣ INTERVIEW ENDPOINTS

### POST `/interview/setup` - Khởi tạo phiên phỏng vấn
Gửi IV và JD, sinh dự đoán câu hỏi

**Request:**
```json
{
  "cv_text": "string - full CV content",
  "jd_text": "string - job description",
  "interview_type": "Behavioral | Technical | HR",
  "language": "vi | en",
  "is_stress_test": false
}
```

**Response:**
```json
{
  "session_id": 123,
  "predicted_questions": ["Q1", "Q2", "Q3", ...]
}
```

**Frontend Call:**
```typescript
// SetupSession.tsx
const response = await authenticatedFetch(
  'http://127.0.0.1:8000/api/v1/interview/setup',
  {
    method: 'POST',
    body: JSON.stringify({
      cv_text: cvText,
      jd_text: jobDescription,
      interview_type: interviewType,
      language: language,
      is_stress_test: false
    })
  }
);
```

---

### POST `/interview/start` - Bắt đầu phỏng vấn, sinh câu hỏi đầu tiên
Tạo LangGraph state, run Profiler → Interviewer nodes

**Query Params:**
```
?session_id=123
```

**Response:**
```json
{
  "first_question": "Can you tell me about...",
  "audio_base64": "base64 encoded audio",
  "current_phase": "Introduction",
  "skills_extracted": ["React", "Python", "..."],
  "question_bank": "..."
}
```

**Frontend Call:**
```typescript
// useInterviewSession.ts
const response = await authenticatedFetch(
  `http://127.0.0.1:8000/api/v1/interview/start?session_id=${id}`,
  { method: 'POST' }
);
```

---

### POST `/interview/chat` - Q&A trong session
User gửi trả lời, backend evaluates + generates next question

**Request:**
```json
{
  "message": "string - transcribed user answer",
  "session_id": number
}
```

**Response:**
```json
{
  "reply": "Next AI question...",
  "evaluations": [
    {
      "star": 4,
      "feedback": "Good answer because...",
      "details": {...}
    }
  ],
  "last_evaluation": {...},
  "audio_base64": "base64 encoded audio",
  "current_phase": "Body",
  "should_end": false
}
```

**Frontend Call:**
```typescript
// useInterviewSession.ts → submitAnswer()
const response = await authenticatedFetch(
  'http://127.0.0.1:8000/api/v1/interview/chat',
  {
    method: 'POST',
    body: JSON.stringify({
      message: finalAnswer,
      session_id: id
    })
  }
);
```

---

### POST `/interview/end` - Kết thúc phỏng vấn
Sinh final report, lưu session vào DB

**Request:**
```json
{
  "session_id": number,
  "history": [
    {"role": "user", "content": "..."},
    {"role": "model", "content": "..."}
  ],
  "cv_text": "...",
  "jd_text": "...",
  "interview_type": "Behavioral",
  "language": "vi",
  "evaluations": [...]
}
```

**Response:**
```json
{
  "feedback": "Overall assessment: You demonstrated strong...",
  "audio_base64": "..."
}
```

**Frontend Call:**
```typescript
// useInterviewSession.ts → endSession()
const response = await authenticatedFetch(
  'http://127.0.0.1:8000/api/v1/interview/end',
  {
    method: 'POST',
    body: JSON.stringify({
      session_id: id,
      history: currentHistory,
      cv_text: session.cv_text,
      jd_text: session.jd_text,
      interview_type: session.interview_type,
      language: session.language,
      evaluations: []
    })
  }
);
```

---

### POST `/interview/transcribe` - Transcribe audio (Demo)
Convert audio file to text using Whisper

**Request:**
```
FormData: { file: AudioFile }
```

**Response:**
```json
{
  "text": "I have 5 years of experience..."
}
```

**Frontend Call:**
```typescript
const formData = new FormData();
formData.append('file', audioBlob);
const response = await authenticatedFetch(
  'http://127.0.0.1:8000/api/v1/interview/transcribe',
  { method: 'POST', body: formData }
);
```

---

## 2️⃣ HISTORY ENDPOINTS

### GET `/history/` - Danh sách tất cả sessions
Lấy list sessions của user (sorted by created_at DESC)

**Response:**
```json
[
  {
    "id": 123,
    "interview_type": "Technical",
    "created_at": "2026-04-15T10:30:00",
    "score": 85,
    "language": "vi"
  },
  {
    "id": 122,
    "interview_type": "Behavioral",
    "created_at": "2026-04-14T15:20:00",
    "score": 78,
    "language": "en"
  }
]
```

**Frontend Call:**
```typescript
// useDashboardData.ts
const response = await authenticatedFetch(
  'http://127.0.0.1:8000/api/v1/history/'
);
```

---

### GET `/history/{interview_id}` - Chi tiết session
Lấy full transcript, evaluations, final report

**Response:**
```json
{
  "id": 123,
  "cv_text": "...",
  "jd_text": "...",
  "interview_type": "Technical",
  "language": "vi",
  "transcript": [
    {"role": "model", "content": "Tell me about your React experience..."},
    {"role": "user", "content": "I have 5 years..."},
    {"role": "model", "content": "Can you explain hooks?"}
  ],
  "evaluations": [
    {"star": 4, "feedback": "Great detail"},
    {"star": 5, "feedback": "Excellent knowledge"}
  ],
  "final_report": "Comprehensive report...",
  "created_at": "2026-04-15T10:30:00",
  "score": 85,
  "status": "completed"
}
```

**Frontend Call:**
```typescript
// useInterviewSession.ts → loadData()
const response = await authenticatedFetch(
  `http://127.0.0.1:8000/api/v1/history/${id}`
);
```

---

## 3️⃣ USER ENDPOINTS

### POST `/user/onboard` - Upload CV & Onboarding
Extract skills & info from CV, mark user as onboarded

**Request:**
```json
{
  "cv_text": "string - full CV content",
  "name": "string - display name"
}
```

**Response:**
```json
{
  "status": "success",
  "skills": ["React", "Python", "PostgreSQL", "..."],
  "user_id": 42,
  "info": {
    "full_name": "John Doe",
    "skills": ["React", "Python", "..."],
    "dob": "1990-01-01",
    "current_position": "Senior Engineer"
  }
}
```

**Backend Workflow:**
1. Call `extract_cv_info_logic(cv_text)` → Profiler service
2. Parse CV using LLM → extract skills, name, DOB, experience
3. Update User record: `is_onboarded = True`

**Frontend Call:**
```typescript
// Onboarding.tsx → handleSubmit()
const response = await authenticatedFetch(
  'http://127.0.0.1:8000/api/v1/user/onboard',
  {
    method: 'POST',
    body: JSON.stringify({
      cv_text: cvText,
      name: displayName
    })
  }
);
```

---

### GET `/user/profile` - Lấy user profile
Thông tin profile hiện tại

**Response:**
```json
{
  "onboarded": true,
  "cv_text": "...",
  "skills": ["React", "Python", "..."],
  "name": "john_doe",
  "full_name": "John Doe",
  "dob": "1990-01-01",
  "current_position": "Senior Software Engineer"
}
```

**Frontend Call:**
```typescript
// AuthContext.tsx → fetchProfile()
const response = await authenticatedFetch(
  'http://127.0.0.1:8000/api/v1/user/profile'
);
```

---

## 🔄 Common Response Patterns

### Success Response (2xx)
```json
{
  "data": {...},
  "status": "success"
}
```

### Error Response (4xx, 5xx)
```json
{
  "detail": "Error message explaining what went wrong"
}
```

### Common HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 400 | Bad Request - Invalid input |
| 403 | Forbidden - User not onboarded / unauthorized |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## 🔐 Header Examples

**With Content-Type:**
```
GET http://127.0.0.1:8000/api/v1/user/profile
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMyJ9...
Content-Type: application/json
```

**With FormData (no Content-Type header):**
```
POST http://127.0.0.1:8000/api/v1/interview/transcribe
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMyJ9...
Content-Type: multipart/form-data
```

---

## 📊 Interview State Transitions

```
setup
  ↓ [POST /interview/start]
in_progress
  ↓ [POST /interview/chat (repeat)]
in_progress
  ↓ [POST /interview/end]
completed
```

---

## ⏱️ Typical Interview Flow

1. **Setup Phase** (2-3 sec)
   - POST `/interview/setup` → Create session

2. **Interview Phase** (5-10 min)
   - POST `/interview/start` → First question
   - Loop 3-5 times:
     - POST `/interview/transcribe` → Audio to text
     - POST `/interview/chat` → AI evaluates + next question
   - Last phase = "Closing"

3. **End Phase** (1-2 sec)
   - POST `/interview/end` → Final report

4. **Review Phase** (offline)
   - GET `/history/{id}` → View results

---

## 🚀 Quick Curl Examples

### Setup Interview
```bash
curl -X POST http://127.0.0.1:8000/api/v1/interview/setup \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "cv_text": "...",
    "jd_text": "...",
    "interview_type": "Technical",
    "language": "vi"
  }'
```

### Get User Profile
```bash
curl -X GET http://127.0.0.1:8000/api/v1/user/profile \
  -H "Authorization: Bearer {token}"
```

### Get Interview History
```bash
curl -X GET http://127.0.0.1:8000/api/v1/history/ \
  -H "Authorization: Bearer {token}"
```

---

## 💡 Important Notes

- All requests require valid Firebase JWT token
- `authenticatedFetch()` in AuthContext handles token injection
- Interview state is maintained in LangGraph with SQLAlchemy checkpointing
- Audio responses use Base64 encoding
- CV parsing uses LLM (GPT-4o) for extraction
- Questions are generated with high creativity (temp: 0.7)
- Evaluations use low temperature (temp: 0.2) for consistency

