# Feature List

## Phase 1: MVP Bắt buộc (Must-have)
*Mục tiêu: Hoàn thiện luồng phỏng vấn cơ bản từ đầu đến cuối.*

1. **Authentication:** Đăng nhập bằng Google (Firebase Auth).
2. **Context Setup:**
   - Form nhập Job Description (Text).
   - Form nhập/dán nội dung CV (Text).
   - Chọn loại phỏng vấn (HR/Behavioral) và ngôn ngữ (VI/EN).
3. **Interview Interface (Text & Voice cơ bản):**
   - Nút "Start/Stop Recording" sử dụng Web Speech API.
   - Hiển thị transcript realtime (câu hỏi của AI và câu trả lời của User).
4. **AI Evaluation Engine:**
   - Tích hợp Gemini API để sinh câu hỏi dựa trên CV/JD.
   - Chấm điểm câu trả lời theo Rubric (Relevance, Structure, Clarity).
   - Sinh Feedback chi tiết và Better Version (câu trả lời mẫu).
5. **Session Summary:**
   - Màn hình kết quả sau khi kết thúc phỏng vấn.
   - Hiển thị điểm tổng trung bình và danh sách các câu hỏi/đáp kèm feedback.

## Phase 2: MVP Nâng cao (Should-have)
*Mục tiêu: Tăng tính thực chiến và khả năng theo dõi tiến bộ.*

1. **Stress-Test Mode:** Thêm toggle bật chế độ khó. AI sẽ hỏi xoáy, phản biện lại câu trả lời của user.
2. **STAR Framework Enforcer:** Giao diện bóc tách rõ câu trả lời của user đã đủ S-T-A-R chưa.
3. **Dashboard & History:**
   - Trang tổng quan xem lại lịch sử các buổi phỏng vấn.
   - Biểu đồ tiến bộ (Line chart điểm số).
4. **Actionable Improvement Plan:** Sinh ra 3 action items cụ thể sau mỗi buổi.

## Phase 3: Future Scope (Could-have / Won't-have for now)
*Mục tiêu: Mở rộng tính năng cao cấp.*

1. **Multi-Agent Panel:** Phỏng vấn với 2 AI cùng lúc (vd: 1 HR hỏi soft skills, 1 Tech Lead hỏi technical).
2. **Auto-Interrupt:** AI tự động ngắt lời nếu user nói lan man quá 2 phút (đòi hỏi xử lý voice stream phức tạp).
3. **Video/Body Language Analysis:** Phân tích biểu cảm khuôn mặt, ánh mắt qua webcam.
4. **PDF Parsing:** Tự động trích xuất text từ file PDF CV tải lên (thay vì bắt user copy/paste text).
