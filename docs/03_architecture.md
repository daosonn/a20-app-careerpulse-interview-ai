# System Architecture

## 1. Overview
Hệ thống được thiết kế theo mô hình Client-Server, ưu tiên sự đơn giản, dễ triển khai cho MVP nhưng vẫn đảm bảo khả năng mở rộng (scalable) cho các tính năng AI phức tạp sau này.

## 2. Tech Stack Selection
- **Frontend:** React 19 + Vite + TailwindCSS + shadcn/ui.
  - *Lý do:* Phổ biến, render nhanh, UI component có sẵn giúp xây dựng giao diện chuyên nghiệp nhanh chóng.
- **Backend:** Node.js + Express.js (Full-stack Vite setup).
  - *Lý do:* Dùng chung ngôn ngữ TypeScript với Frontend. Dễ dàng xử lý API routes, stream data từ LLM.
- **Database:** Firebase Firestore.
  - *Lý do:* NoSQL linh hoạt, realtime updates, tích hợp sẵn Authentication, setup cực nhanh cho MVP.
- **Authentication:** Firebase Authentication (Google Auth).
  - *Lý do:* An toàn, không cần tự quản lý mật khẩu, trải nghiệm đăng nhập 1-click.
- **AI Orchestration:** Google Gemini API (`@google/genai`).
  - *Lý do:* Khả năng xử lý context dài (tốt cho CV/JD), reasoning tốt, hỗ trợ structured output (JSON) để chấm điểm.
- **Voice Pipeline (MVP):**
  - *Speech-to-Text (STT):* Web Speech API (Native browser) - Miễn phí, độ trễ bằng 0, dễ implement.
  - *Text-to-Speech (TTS):* Web Speech API hoặc tích hợp API TTS bên thứ 3 nếu cần giọng đọc tự nhiên hơn.

## 3. Data Flow & User Flow
1. **Setup:** User đăng nhập -> Upload CV (PDF parse thành text ở client/server) -> Nhập JD -> Lưu vào Firestore.
2. **Init Session:** Backend gọi Gemini API truyền CV+JD để sinh danh sách câu hỏi -> Lưu Session vào Firestore.
3. **Interview Loop:**
   - Frontend dùng Web Speech API nhận diện giọng nói user -> Text.
   - Gửi Text (câu trả lời) lên Backend.
   - Backend gọi Gemini API (kèm system prompt khắt khe + rubric) để:
     1. Đánh giá câu trả lời (JSON: điểm, feedback, better version).
     2. Sinh câu hỏi tiếp theo hoặc phản biện.
   - Trả kết quả về Frontend.
   - Frontend hiển thị feedback và dùng TTS đọc câu hỏi tiếp theo.
4. **End Session:** Tổng hợp điểm số -> Lưu vào Firestore -> Hiển thị Dashboard.

## 4. Architecture Diagram (Mental Model)
```text
[ Client (React) ]
  |-- UI Components (shadcn)
  |-- Web Speech API (STT/TTS)
  |-- State Management (React Context/Hooks)
        |
      (REST API / JSON)
        |
[ Server (Express.js) ]
  |-- Auth Middleware (Firebase Admin)
  |-- Interview Controller
  |-- Evaluation Engine (Prompt Builder)
        |
    +---+---+------------------+
    |                          |
[ Gemini API ]         [ Firebase Firestore ]
(LLM Processing)       (Data Persistence)
```

## 5. Tách biệt Core Logic
- **Prompt Layer:** Tách riêng các file chứa system prompts (vd: `prompts/interviewer.ts`, `prompts/evaluator.ts`) để dễ dàng tinh chỉnh tính "khắt khe" mà không chạm vào logic code.
- **Evaluation Engine:** Module độc lập nhận input là (Question, Answer, CV context) và trả ra RubricScore object.
