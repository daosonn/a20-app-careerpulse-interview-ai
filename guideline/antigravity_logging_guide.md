# Hướng dẫn Ghi chép AI (Logging) cho AntiGravity IDE

Tài liệu này hướng dẫn cách ghi lại hoạt động sử dụng AI khi làm việc với **AntiGravity IDE** để đảm bảo tuân thủ quy định của dự án và không bị chặn khi `git push`.

---

## 📌 Tại sao cần Log?

Trong dự án này, hệ thống **AI-Log-Hook** được thiết lập để theo dõi sự đóng góp của AI. Mọi thay đổi mã nguồn nếu không có log đi kèm sẽ bị coi là vi phạm và có thể bị từ chối bởi Git Hook (`pre-push`).

---

## 🚀 Các cách thực hiện Log

Vì AntiGravity không có hệ thống hook tự động trực tiếp, chúng ta sử dụng các script bổ trợ sau:

### Cách 1: Sử dụng Scanner tự động (`log_antigravity.py`)
Script này quét bộ nhớ máy tính để tìm lịch sử chat.
*   **Dùng khi:** Trước khi `git push` hoặc sau khi đã làm xong một task lớn.
*   **Trạng thái App:** Có thể đang mở hoặc đã tắt AntiGravity đều được (script đọc file trên ổ cứng).
*   **Lưu ý:** Thường cần đợi ~5 phút sau khi chat xong để AntiGravity kịp tạo file tóm tắt thì scanner mới nhận diện được chính xác.

### Cách 2: Log thủ công (`log_manual.py`) - KHUYÊN DÙNG
Đây là cách an toàn và chủ động nhất.
*   **Dùng khi:** Ngay sau khi AI vừa viết xong một đoạn code quan trọng, hoặc khi bạn chuẩn bị commit code.
*   **Trạng thái App:** Dùng ngay khi đang mở app, đang trong luồng làm việc.
*   **Tại sao:** Không cần đợi scanner, đảm bảo 100% log được ghi lại đúng ý bạn.

---

## 🔍 Cơ chế hoạt động

1.  **Dữ liệu nguồn:** AntiGravity lưu lịch sử tại `%USERPROFILE%\.gemini\antigravity\brain\`.
2.  **So khớp dự án:** Script scanner sẽ đối chiếu URL của `git remote` và tên thư mục hiện tại để xác định hội thoại nào thuộc về repo này.
3.  **Lưu trữ:** Dữ liệu sau khi xử lý sẽ được ghi vào file `.ai-log/session.jsonl` ở gốc dự án.

---

## 🛠️ Xử lý sự cố (Troubleshooting)

### 1. Scanner báo: "No new Antigravity sessions found"
*   **Nguyên nhân:** AntiGravity chưa kịp ghi file tóm tắt (`overview.txt`) hoặc chưa đồng bộ dữ liệu vào Brain.
*   **Giải pháp:** Sử dụng **Cách 2 (Manual Log)** để ghi lại prompt gần nhất hoặc đợi vài phút rồi chạy lại lệnh quét với tham số `--all`.

### 2. Bị chặn khi Git Push
*   **Nguyên nhân:** File `.ai-log/session.jsonl` không có dữ liệu mới cho các thay đổi bạn vừa commit.
*   **Giải pháp:** Chạy lệnh manual log cho task vừa làm, sau đó thực hiện push lại.

---

## ⏰ Lịch trình (Workflow Timeline)

Để không bao giờ bị quên hoặc bị lỗi khi push code, hãy tuân theo lịch trình này:

1.  **Trong lúc đang Code:** Thỉnh thoảng chạy `log_manual.py` sau mỗi lần AI giúp xong một tính năng nhỏ. Đây là lúc nội dung còn "nóng" trong đầu, bạn sẽ mô tả chính xác nhất.
2.  **Trước khi Commit:** Chạy `log_antigravity.py --auto` để quét lại xem có sót phiên chat nào mà bạn chưa kịp log manual không.
3.  **Trước khi Push GitHub:** Đây là bước cuối cùng. Nếu bạn chưa log, Git Hook sẽ nhắc nhở hoặc chặn bạn. Hãy chạy scanner một lần cuối để đảm bảo mọi thứ đã sẵn sàng.
4.  **Khi mở/tắt App:** Việc log **KHÔNG** phụ thuộc vào việc bạn đóng hay mở app vì script đọc dữ liệu từ ổ cứng. Tuy nhiên, khuyến khích log ngay khi đang dùng app để đảm bảo tính thời sự.

---

## ⚡ Lưu ý quan trọng
*   Hãy đảm bảo bạn đã cài đặt hook bằng cách chạy: `bash scripts/setup_hooks.sh` (chỉ cần làm 1 lần).
*   Luôn kiểm tra file `.ai-log/session.jsonl` để chắc chắn dữ liệu đã được ghi.

---
*Cập nhật lần cuối: 13/04/2026*
