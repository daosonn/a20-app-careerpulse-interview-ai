# Phân tích Sản phẩm & Tách MVP

## 1. Core Value (Giá trị cốt lõi)
Giá trị cốt lõi của AI Interview Coach nằm ở **tính thực chiến và phản hồi sâu (deep feedback)**. Thay vì một chatbot hỏi đáp thông thường với những lời khen ngợi chung chung ("thảo mai"), hệ thống đóng vai trò một nhà tuyển dụng khó tính, có khả năng tạo áp lực, đánh giá câu trả lời dựa trên các framework chuẩn (STAR/PAR) và chỉ ra chính xác điểm yếu của ứng viên để cải thiện.

## 2. Phân tách MVP và MVP+

### MVP (Minimum Viable Product) - Bắt buộc cho phiên bản đầu tiên:
- **Ngữ cảnh hóa:** Upload CV (PDF/Text) và JD (Text) để AI hiểu bối cảnh.
- **Tạo câu hỏi:** Sinh danh sách câu hỏi dự đoán dựa trên CV và JD.
- **Mock Interview cơ bản (Voice):** Giao diện phỏng vấn 1-1. Hỗ trợ Speech-to-Text (STT) để nhận câu trả lời của user và Text-to-Speech (TTS) để AI đọc câu hỏi.
- **Đánh giá & Feedback:** Chấm điểm câu trả lời theo Rubric (Relevance, Structure, Clarity) và framework STAR. Đưa ra câu trả lời mẫu (Better version).
- **Lịch sử & Tiến bộ:** Lưu trữ transcript, điểm số và feedback của các phiên phỏng vấn trước.

### MVP+ (Nâng cao) - Sẽ làm sau khi MVP ổn định:
- **Stress-Test Mode:** AI ngắt lời khi user trả lời lan man, đặt câu hỏi dồn ép (follow-up questions) gắt gao hơn.
- **Multi-Agent Audit:** Phỏng vấn hội đồng (Panel Interview) với 2-3 AI persona (HR, Tech Lead, Culture Fit).
- **Phát hiện lỗi lặp lại:** Phân tích dữ liệu lịch sử để chỉ ra "điểm mù" (blind spots) qua nhiều phiên.
- **Kế hoạch cải thiện ngắn hạn:** Sinh ra action plan cụ thể sau mỗi buổi học.

### Future Scope (Tương lai xa):
- Phân tích ngôn ngữ cơ thể (Body language analysis) qua camera.
- Tích hợp trực tiếp với các nền tảng tuyển dụng.

## 3. Nhận diện Rủi ro (Risks)

### Technical Risks (Rủi ro kỹ thuật):
- **Độ trễ (Latency) của Voice Pipeline:** Quá trình STT -> LLM xử lý -> TTS có thể mất vài giây, làm mất đi tính tự nhiên của cuộc hội thoại. *Giải pháp MVP:* Dùng Web Speech API cho STT/TTS để giảm trễ, hiển thị trạng thái "AI đang suy nghĩ" để quản lý kỳ vọng.
- **LLM Hallucination & Character Break:** AI có thể quên vai trò "người phỏng vấn khó tính" và quay về làm trợ lý ảo thân thiện. *Giải pháp:* System prompt cực kỳ chặt chẽ, sử dụng few-shot prompting.

### UX Risks (Rủi ro trải nghiệm người dùng):
- **Feedback quá khắt khe gây nản chí:** Người dùng có thể bị sốc hoặc mất tự tin nếu điểm số quá thấp. *Giải pháp:* Thiết kế UI/UX theo hướng "Tough Love" - khắt khe nhưng mang tính xây dựng. Luôn đi kèm lời khuyên cụ thể và câu trả lời mẫu để họ thấy hy vọng cải thiện.
- **Ngại nói chuyện với máy:** *Giải pháp:* Giao diện tối giản, tập trung vào transcript và voice wave để tạo cảm giác đang gọi điện thoại (audio call) thay vì chat với robot.

## 4. Yếu tố khác biệt so với Chatbot thường
- **Rubric-based:** Mọi đánh giá đều dựa trên tiêu chí rõ ràng (thang điểm 1-5 cho từng kỹ năng), không đánh giá cảm tính.
- **STAR/PAR Enforcer:** Ép người dùng phải tư duy theo cấu trúc. Nếu thiếu "Result" trong câu chuyện, AI sẽ hỏi xoáy vào đó.
- **Không tâng bốc:** Feedback đi thẳng vào vấn đề: "Bạn nói quá dài ở phần bối cảnh (2 phút) nhưng phần hành động lại quá chung chung."
