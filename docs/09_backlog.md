# Technical Backlog & Implementation Roadmap

## Phase 1: Project Setup & Foundation (Current Focus)
- [ ] **Task 1.1:** Khởi tạo dự án Vite + React + TypeScript.
- [ ] **Task 1.2:** Cài đặt TailwindCSS, cấu hình Design System (màu sắc, font chữ).
- [ ] **Task 1.3:** Cài đặt shadcn/ui và thêm các component cơ bản (Button, Card, Input, Textarea).
- [ ] **Task 1.4:** Thiết lập routing cơ bản (Home, Setup, Interview, Dashboard).
- [ ] **Task 1.5:** Tích hợp Firebase (Khởi tạo App, Auth, Firestore). *Lưu ý: Dùng `set_up_firebase` tool.*

## Phase 2: Context Setup (CV/JD Input)
- [ ] **Task 2.1:** Xây dựng UI trang Setup (Form nhập CV, JD, chọn loại phỏng vấn).
- [ ] **Task 2.2:** Viết logic lưu dữ liệu Setup vào Firestore (collection `interview_sessions`).
- [ ] **Task 2.3:** Viết service gọi Gemini API để sinh câu hỏi đầu tiên dựa trên CV/JD.

## Phase 3: Core Interview Interface (Text-based MVP)
- [ ] **Task 3.1:** Xây dựng UI màn hình Interview (Chat layout: AI bên trái, User bên phải).
- [ ] **Task 3.2:** Tích hợp Gemini API xử lý luồng hội thoại (Nhận câu trả lời -> Đánh giá -> Sinh câu hỏi tiếp theo).
- [ ] **Task 3.3:** Xây dựng UI Feedback Panel (hiển thị điểm, STAR analysis, Better version) ngay dưới mỗi câu trả lời.
- [ ] **Task 3.4:** Viết logic lưu từng lượt hội thoại (`transcript_segments`) và đánh giá (`evaluations`) vào Firestore.

## Phase 4: Voice Pipeline Integration
- [ ] **Task 4.1:** Tích hợp Web Speech API (SpeechRecognition) cho nút Thu âm. Xử lý xin quyền mic, hiển thị trạng thái recording.
- [ ] **Task 4.2:** Tích hợp Web Speech API (SpeechSynthesis) để AI đọc câu hỏi.

## Phase 5: Dashboard & History
- [ ] **Task 5.1:** Xây dựng UI trang Dashboard.
- [ ] **Task 5.2:** Fetch dữ liệu từ Firestore hiển thị danh sách lịch sử phỏng vấn.
- [ ] **Task 5.3:** Tích hợp thư viện Recharts vẽ biểu đồ tiến bộ.
- [ ] **Task 5.4:** Xây dựng trang Chi tiết Session (xem lại toàn bộ transcript và feedback của phiên cũ).

## Phase 6: Refinement & MVP+ Features
- [ ] **Task 6.1:** Thêm toggle Stress-Test Mode (thay đổi system prompt của Gemini).
- [ ] **Task 6.2:** Xử lý các edge cases (lỗi mạng, API timeout, từ chối quyền mic).
- [ ] **Task 6.3:** Tối ưu hóa UI/UX (thêm animations với `framer-motion`).
