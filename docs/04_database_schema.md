# Database Schema (Firebase Firestore)

Sử dụng NoSQL document-based structure.

## Collections

### 1. `users`
Lưu thông tin cơ bản của người dùng.
- `uid` (string, PK)
- `email` (string)
- `displayName` (string)
- `photoURL` (string)
- `createdAt` (timestamp)

### 2. `profiles` (Sub-collection of `users` hoặc lưu trực tiếp trong `users`)
Lưu trữ CV và bối cảnh mặc định.
- `cvText` (string) - Text trích xuất từ CV
- `targetRole` (string) - Vị trí mong muốn
- `yearsOfExperience` (number)

### 3. `interview_sessions`
Mỗi phiên phỏng vấn thử.
- `id` (string, PK)
- `userId` (string, FK)
- `jobDescription` (string)
- `interviewType` (string) - 'HR', 'Technical', 'Behavioral'
- `language` (string) - 'vi', 'en'
- `status` (string) - 'in_progress', 'completed'
- `overallScore` (number) - Điểm trung bình cuối cùng
- `createdAt` (timestamp)
- `completedAt` (timestamp)

### 4. `transcript_segments` (Sub-collection of `interview_sessions`)
Lưu từng lượt hỏi - đáp trong một session.
- `id` (string, PK)
- `sessionId` (string, FK)
- `turnOrder` (number) - Thứ tự (1, 2, 3...)
- `question` (string) - Câu hỏi của AI
- `answer` (string) - Câu trả lời của User (từ STT)
- `durationSeconds` (number) - Thời gian trả lời
- `createdAt` (timestamp)

### 5. `evaluations` (1-1 mapping với `transcript_segments`)
Lưu kết quả đánh giá cho từng câu trả lời.
- `segmentId` (string, PK/FK)
- `sessionId` (string, FK)
- `userId` (string, FK)
- `rubricScores` (map)
  - `relevance`: number (1-5)
  - `structure`: number (1-5)
  - `clarity`: number (1-5)
  - `depth`: number (1-5)
- `feedback` (string) - Nhận xét chi tiết, chỉ ra lỗi sai
- `betterVersion` (string) - Câu trả lời mẫu được viết lại
- `starAnalysis` (map) - Phân tích theo STAR
  - `situation`: boolean/string
  - `task`: boolean/string
  - `action`: boolean/string
  - `result`: boolean/string

### 6. `improvement_plans` (Tạo ra khi kết thúc session)
- `id` (string, PK)
- `sessionId` (string, FK)
- `userId` (string, FK)
- `actionItems` (array of strings)
- `identifiedBlindSpots` (array of strings)
- `createdAt` (timestamp)
