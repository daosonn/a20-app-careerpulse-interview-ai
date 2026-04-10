# Test Scenarios

## 1. Setup & Context Flow
- **TC-01 (Success):** User nhập CV text và JD text hợp lệ, chọn ngôn ngữ Tiếng Việt -> Hệ thống lưu thành công và chuyển sang màn hình phỏng vấn.
- **TC-02 (Edge Case):** User nhập CV quá dài (> 10,000 từ) -> Hệ thống cảnh báo vượt quá giới hạn hoặc tự động cắt ngắn phần quan trọng.
- **TC-03 (Failure):** User bỏ trống JD -> Nút "Bắt đầu" bị disable, hiển thị lỗi yêu cầu nhập JD.

## 2. Voice Interview Flow
- **TC-04 (Success):** User bấm "Bắt đầu thu âm", nói một đoạn ngắn, bấm "Dừng" -> STT nhận diện đúng text, hiển thị lên UI, gửi API thành công.
- **TC-05 (Edge Case):** User bấm thu âm nhưng không nói gì (im lặng 10s) -> Hệ thống tự ngắt, AI hỏi "Bạn có đang ở đó không?" hoặc "Bạn cần thêm thời gian suy nghĩ không?".
- **TC-06 (Failure):** Trình duyệt không cấp quyền Microphone -> Hiển thị thông báo lỗi thân thiện hướng dẫn cách mở quyền.

## 3. Evaluation & Feedback Flow
- **TC-07 (Success):** User trả lời hoàn chỉnh -> Hệ thống trả về JSON hợp lệ, UI render đúng điểm số, phân tích STAR và Better Version.
- **TC-08 (Edge Case):** User trả lời quá ngắn ("Em không biết") -> AI đánh giá điểm thấp (1/5), feedback khuyên cách xử lý khi gặp câu hỏi khó, không sinh Better Version vô lý.
- **TC-09 (Failure):** Gemini API bị timeout hoặc lỗi 500 -> Hiển thị toast error "Hệ thống đang quá tải, vui lòng thử lại câu trả lời", không làm crash app.

## 4. Stress-Test Mode
- **TC-10 (Success):** Bật Stress-test -> AI đặt câu hỏi follow-up xoáy sâu vào lỗ hổng trong câu trả lời trước của user (vd: "Bạn nói bạn tăng 20% doanh thu, vậy chính xác bạn đã dùng chiến lược gì?").

## 5. Dashboard & History
- **TC-11 (Success):** User hoàn thành session -> Quay ra Dashboard thấy session mới nhất xuất hiện trên cùng, biểu đồ điểm số được cập nhật.
- **TC-12 (Edge Case):** User chưa có session nào -> Dashboard hiển thị Empty State đẹp mắt, gợi ý "Bắt đầu bài phỏng vấn đầu tiên".
