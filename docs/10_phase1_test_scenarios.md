# Phase 1 Test Scenarios

## 1. Authentication Flow
- **TC-1.1 (Success):** Người dùng chưa đăng nhập truy cập trang chủ (`/`) -> Bị redirect về trang `/login`.
- **TC-1.2 (Success):** Tại trang `/login`, bấm "Đăng nhập với Google" -> Popup hiện ra, chọn tài khoản thành công -> Redirect về trang chủ (`/`).
- **TC-1.3 (Success):** Người dùng đã đăng nhập bấm nút Đăng xuất trên Header -> Đăng xuất thành công, redirect về `/login`.

## 2. Dashboard Flow
- **TC-2.1 (Empty State):** Tài khoản mới tinh đăng nhập -> Hiển thị màn hình "Chưa có phiên phỏng vấn nào" kèm nút "Bắt đầu ngay".
- **TC-2.2 (Success):** Tài khoản đã có dữ liệu -> Hiển thị danh sách các phiên phỏng vấn đã tạo (sắp xếp mới nhất lên đầu).

## 3. Setup Session Flow (CV/JD Input)
- **TC-3.1 (Validation Error):** Bỏ trống CV hoặc JD và bấm "Bắt đầu phân tích" -> Hiển thị lỗi "Vui lòng nhập đầy đủ CV và Job Description".
- **TC-3.2 (Success):** Nhập đầy đủ CV, JD, chọn loại phỏng vấn và ngôn ngữ -> Bấm "Bắt đầu phân tích" -> Nút chuyển sang trạng thái "Đang phân tích..." (loading).
- **TC-3.3 (Success - API & DB):** Sau khi loading xong -> Hệ thống lưu thành công vào Firestore và tự động chuyển hướng sang trang chi tiết phiên (`/session/:id`).

## 4. Session Detail Flow (Predicted Questions)
- **TC-4.1 (Success):** Truy cập trang chi tiết phiên hợp lệ -> Hiển thị đúng danh sách 5 câu hỏi dự đoán được sinh ra từ Gemini API.
- **TC-4.2 (Failure):** Truy cập ID phiên không tồn tại -> Hiển thị thông báo "Không tìm thấy phiên phỏng vấn".
