# Rubric Design

Hệ thống sử dụng thang điểm 1-5 cho mỗi tiêu chí. AI sẽ được cung cấp rubric này trong System Prompt để đảm bảo tính nhất quán khi chấm điểm.

## 1. Relevance (Độ bám sát câu hỏi)
Đánh giá xem ứng viên có trả lời đúng trọng tâm câu hỏi không, hay đang đi lạc đề.
- **1 điểm:** Trả lời hoàn toàn lạc đề hoặc né tránh câu hỏi.
- **3 điểm:** Trả lời được một phần, nhưng còn lan man hoặc đưa thông tin thừa.
- **5 điểm:** Đi thẳng vào vấn đề, trả lời chính xác những gì được hỏi, không dư thừa.

## 2. Structure (Cấu trúc - Chuẩn STAR/PAR)
Đánh giá tính logic và cách sắp xếp thông tin. Bắt buộc áp dụng STAR (Situation, Task, Action, Result) cho câu hỏi hành vi.
- **1 điểm:** Kể chuyện lộn xộn, không rõ bối cảnh, không có kết quả.
- **3 điểm:** Có bối cảnh và hành động, nhưng thiếu Kết quả (Result) cụ thể hoặc đo lường được.
- **5 điểm:** Cấu trúc STAR hoàn hảo. Bối cảnh ngắn gọn, hành động chi tiết, kết quả có số liệu chứng minh.

## 3. Specificity (Tính cụ thể)
Đánh giá mức độ chi tiết của "Action" (Hành động).
- **1 điểm:** Dùng từ ngữ chung chung ("Tôi đã cố gắng hết sức", "Tôi quản lý dự án").
- **3 điểm:** Có nêu hành động nhưng dùng ngôi thứ nhất số nhiều ("Chúng tôi đã làm..."), không rõ vai trò cá nhân.
- **5 điểm:** Nêu rõ "TÔI đã làm gì", sử dụng các động từ mạnh, mô tả rõ công cụ/phương pháp đã dùng.

## 4. Clarity & Conciseness (Sự rõ ràng và súc tích)
Đánh giá cách diễn đạt.
- **1 điểm:** Nói vấp nhiều, câu cú lủng củng, lặp từ, quá dài dòng (>3 phút cho 1 câu).
- **3 điểm:** Dễ hiểu nhưng đôi chỗ còn rườm rà, có thể rút gọn.
- **5 điểm:** Diễn đạt mạch lạc, trôi chảy, độ dài hoàn hảo (1.5 - 2 phút).

## 5. Confidence & Professionalism (Sự tự tin và chuyên nghiệp)
(Đánh giá qua text transcript và các từ ngữ ngập ngừng như "ờ", "ừm" nếu STT bắt được).
- **1 điểm:** Dùng nhiều từ ngữ thiếu tự tin ("Em nghĩ là...", "Chắc là..."), xin lỗi quá nhiều.
- **3 điểm:** Thái độ bình thường, an toàn.
- **5 điểm:** Khẳng định vấn đề tự tin, dùng từ ngữ chuyên nghiệp, thể hiện thái độ tích cực ngay cả khi nói về thất bại.

## Cách Map với STAR Framework trong Prompt:
AI sẽ được yêu cầu xuất JSON có format:
```json
{
  "star_analysis": {
    "situation": "User có nêu bối cảnh (Dự án X bị trễ deadline).",
    "task": "Nhiệm vụ chưa rõ ràng.",
    "action": "Nêu được hành động tổ chức họp, nhưng thiếu chi tiết kỹ thuật.",
    "result": "Thiếu hoàn toàn kết quả."
  },
  "scores": {
    "relevance": 4,
    "structure": 2,
    "specificity": 3,
    "clarity": 4,
    "confidence": 3
  }
}
```
