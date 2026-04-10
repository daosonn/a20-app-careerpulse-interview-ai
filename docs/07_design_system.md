# Design System & UI/UX Direction

## 1. Design Philosophy
- **Professional & Focused:** Giao diện cần tạo cảm giác nghiêm túc như một công cụ làm việc chuyên nghiệp, không màu mè như app giải trí.
- **Calm & Reassuring:** Phỏng vấn vốn đã áp lực, UI cần giúp giảm căng thẳng. Sử dụng nhiều khoảng trắng (whitespace), typography rõ ràng.
- **Action-Oriented:** Feedback phải dễ đọc, dễ scan. Lỗi sai nổi bật, cách sửa rõ ràng.

## 2. Color Palette
- **Primary (Brand):** Slate / Navy Blue (Tạo sự tin cậy, chuyên nghiệp).
  - Primary: `bg-slate-900`
  - Secondary: `bg-slate-100`
- **Success/Positive:** Emerald Green (Dùng cho điểm cao, feedback tốt).
  - Text: `text-emerald-600`
- **Warning/Improvement:** Amber / Orange (Dùng cho điểm cần cải thiện, không dùng màu Đỏ chói lóa gây hoảng sợ).
  - Text: `text-amber-600`
- **Background:** Off-white (`bg-gray-50`) để dịu mắt.
- **Surface:** White (`bg-white`) cho các thẻ (cards).

## 3. Typography
- **Font:** Inter (Sans-serif) - Sạch sẽ, dễ đọc trên màn hình.
- **Headings:** Font-semibold, tracking-tight.
- **Body:** Text-gray-600 cho nội dung phụ, text-gray-900 cho nội dung chính.

## 4. Key UI Components

### Interview Interface (Màn hình phỏng vấn)
- **Layout:** Chia đôi màn hình (Split view) trên Desktop.
  - Trái: Avatar AI đơn giản (hoặc sóng âm - audio wave) + Nút thu âm lớn.
  - Phải: Transcript cuộn dọc (như app chat).
- **Recording Button:** Nút tròn to, màu đỏ/primary khi đang thu âm, có hiệu ứng pulse (nhịp đập) để báo hiệu hệ thống đang nghe.

### Feedback Panel (Thẻ nhận xét)
- Thiết kế dạng Card.
- **Header:** Điểm số tổng quan (vd: 3.5/5) kèm badge màu (Xanh/Vàng).
- **Body:**
  - Tab 1: Phân tích STAR (Dùng icon check/cross để chỉ ra phần nào thiếu).
  - Tab 2: Lời khuyên cụ thể (Deep feedback).
  - Tab 3: Better Version (Được highlight trong khung background nhạt để dễ phân biệt).

### Dashboard (Lịch sử & Tiến bộ)
- **Charts:** Sử dụng Line chart (Recharts) để vẽ biểu đồ điểm số qua các ngày.
- **Session List:** Dạng bảng hoặc danh sách thẻ, hiển thị Ngày, Vị trí ứng tuyển, Điểm số.

## 5. Responsive Strategy
- **Mobile-first:** Màn hình phỏng vấn trên mobile sẽ xếp dọc (Avatar AI ở trên, Transcript ở dưới, Nút thu âm dính ở đáy màn hình - sticky bottom).
- **Desktop:** Tận dụng không gian ngang để hiển thị song song Transcript và Feedback.
