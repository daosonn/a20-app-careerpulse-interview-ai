# User Stories List

## Epic 1: Onboarding & Context Setup
- **US-01:** As a người dùng đang chuẩn bị phỏng vấn, I want tải lên CV và JD công việc, So that hệ thống hiểu bối cảnh của tôi và tạo ra câu hỏi phù hợp hơn.
  - *Acceptance Criteria:* Hỗ trợ upload PDF/TXT. Trích xuất được text. Lưu vào database gắn với user.
- **US-12:** As a người dùng, I want chọn loại phỏng vấn mình muốn luyện (HR, Behavioral, Technical), So that buổi mock phù hợp với nhu cầu hiện tại.
  - *Acceptance Criteria:* Có dropdown chọn loại phỏng vấn trước khi bắt đầu.
- **US-13:** As a người dùng, I want luyện bằng tiếng Việt hoặc tiếng Anh, So that phù hợp với công việc tôi đang ứng tuyển.
  - *Acceptance Criteria:* Có toggle chọn ngôn ngữ. AI giao tiếp và nhận diện giọng nói theo đúng ngôn ngữ đã chọn.

## Epic 2: Interview Execution
- **US-02:** As a ứng viên, I want nhận danh sách câu hỏi có khả năng xuất hiện trong buổi phỏng vấn, So that tôi có thể chuẩn bị đúng trọng tâm.
  - *Acceptance Criteria:* Hệ thống sinh ra 5-10 câu hỏi dựa trên CV/JD trước khi bắt đầu phỏng vấn.
- **US-03:** As a người dùng, I want tham gia buổi phỏng vấn thử bằng giọng nói, So that tôi có thể luyện phản xạ trong điều kiện gần giống phỏng vấn thật.
  - *Acceptance Criteria:* Giao diện có nút thu âm. Chuyển đổi giọng nói thành văn bản (STT) và AI phản hồi bằng giọng nói (TTS).
- **US-04:** As a người dùng, I want AI phản ứng giống người phỏng vấn thật, kể cả ngắt lời khi cần, So that tôi làm quen với áp lực. *(MVP+)*
  - *Acceptance Criteria:* Nếu user nói quá 2 phút không vào trọng tâm, AI tự động ngắt lời và chuyển hướng.
- **US-09:** As a người dùng chuẩn bị cho phỏng vấn áp lực cao, I want được luyện trong chế độ khắt khe hơn (Stress-test), So that tôi quen với áp lực. *(MVP+)*
  - *Acceptance Criteria:* Có toggle "Stress-Test Mode". AI sẽ dùng tone giọng lạnh lùng hơn và hỏi xoáy vào điểm yếu.

## Epic 3: Evaluation & Feedback
- **US-05:** As a người dùng, I want nhận feedback cụ thể sau mỗi câu trả lời, So that tôi biết chính xác mình trả lời sai hoặc thiếu ở đâu.
  - *Acceptance Criteria:* Sau mỗi câu hỏi, hiển thị panel feedback phân tích điểm mạnh/yếu.
- **US-06:** As a người dùng, I want được chấm điểm theo tiêu chí rõ ràng, So that tôi biết mức độ sẵn sàng của mình.
  - *Acceptance Criteria:* Hiển thị radar chart hoặc progress bar cho các tiêu chí (Structure, Clarity, Relevance).
- **US-07:** As a người dùng, I want xem một phiên bản trả lời tốt hơn từ câu trả lời của mình, So that tôi biết cụ thể thế nào là câu trả lời tốt.
  - *Acceptance Criteria:* Cung cấp "Better Version" áp dụng chuẩn STAR/PAR dựa trên ý tưởng gốc của user.

## Epic 4: Progress Tracking
- **US-08:** As a người dùng, I want xem lại các buổi phỏng vấn thử trước đó, So that tôi theo dõi được mình đang tiến bộ hay lặp lại lỗi cũ.
  - *Acceptance Criteria:* Có trang Dashboard liệt kê các session cũ, click vào xem chi tiết transcript và điểm số.
- **US-10:** As a người dùng, I want hệ thống chỉ ra những lỗi tôi thường không tự thấy, So that tôi sửa được các vấn đề gốc rễ. *(MVP+)*
  - *Acceptance Criteria:* Hệ thống tổng hợp data từ 3+ sessions để đưa ra nhận xét chung (vd: "Bạn thường quên nêu Kết quả (Result) trong mô hình STAR").
- **US-11:** As a người dùng dễ bị khớp khi phỏng vấn, I want thấy mình tiến bộ qua từng lần luyện, So that tôi tự tin hơn.
  - *Acceptance Criteria:* Biểu đồ line chart thể hiện điểm số trung bình qua thời gian.
- **US-14:** As a người dùng, I want có kế hoạch luyện tập tiếp theo sau mỗi buổi, So that tôi biết mình nên làm gì tiếp. *(MVP+)*
  - *Acceptance Criteria:* Cuối session, sinh ra 3 action items cụ thể cho lần luyện tập tới.
