# Product Requirements Document (PRD) - Refined

## 1. Problem Statement
Ứng viên (sinh viên mới ra trường, người chuyển ngành) thường thiếu kỹ năng phỏng vấn thực chiến. Dù có kiến thức chuyên môn, họ dễ bị tâm lý, trả lời lan man, thiếu cấu trúc (STAR/PAR) và không nhận ra lỗi sai của mình. Các công cụ AI hiện tại phản hồi quá chung chung, thiếu tính khắt khe và không mô phỏng được áp lực của một buổi phỏng vấn thật.

## 2. Target Users
- Sinh viên năm cuối chuẩn bị xin việc.
- Người mới ra trường (Freshers) thiếu kinh nghiệm phỏng vấn.
- Người chuyển ngành (Career changers) cần học cách kể câu chuyện chuyển đổi hợp lý.
- Ứng viên chuẩn bị cho các vòng phỏng vấn cạnh tranh cao.

## 3. Value Proposition
**AI Interview Coach** là nền tảng luyện phỏng vấn thực chiến, đóng vai trò như một nhà tuyển dụng khó tính. Sản phẩm giúp ứng viên làm quen với áp lực, cấu trúc hóa câu trả lời theo chuẩn STAR/PAR, và nhận được phản hồi sâu (deep feedback) chỉ ra chính xác lỗi sai kèm cách khắc phục, giúp họ tự tin đậu phỏng vấn trong thời gian ngắn nhất.

## 4. MVP Features (Minimum Viable Product)
1. **Contextualization:** Upload CV & JD để cá nhân hóa buổi phỏng vấn.
2. **Voice-based Mock Interview:** Giao tiếp bằng giọng nói thời gian thực (STT & TTS).
3. **Rubric-based Evaluation:** Chấm điểm từng câu trả lời theo tiêu chí rõ ràng (Relevance, Structure, Clarity).
4. **Deep Feedback & Better Version:** Chỉ ra lỗi sai cụ thể và gợi ý câu trả lời mẫu tối ưu hơn.
5. **Session History:** Lưu trữ và xem lại lịch sử các buổi phỏng vấn.

## 5. Success Metrics
- **Activation Rate:** % user hoàn thành buổi mock interview đầu tiên.
- **Retention Rate:** % user quay lại luyện tập lần 2, lần 3 trong vòng 1 tuần.
- **Improvement Score:** Điểm số trung bình của user tăng lên sau 3-5 phiên luyện tập.
- **User Satisfaction:** Rating của user về độ hữu ích của feedback (>= 4/5 sao).

## 6. Risks & Mitigations
- **Risk:** Voice latency cao làm gián đoạn trải nghiệm.
  - *Mitigation:* Tối ưu pipeline, sử dụng streaming response từ LLM nếu cần, thiết kế UI hiển thị trạng thái "Listening/Thinking" rõ ràng.
- **Risk:** AI đánh giá sai hoặc không nhất quán.
  - *Mitigation:* Xây dựng prompt template chuẩn hóa với rubric cứng, yêu cầu LLM trả về JSON có cấu trúc để parse điểm số.
