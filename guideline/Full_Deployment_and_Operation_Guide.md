# Hướng dẫn Toàn diện: Vận hành & Triển khai Dự án AI Interviewer

Tài liệu này tổng hợp toàn bộ quy trình từ chạy local, thiết lập tunnel kết nối (Cloudflare/Ngrok), cho đến triển khai frontend lên Vercel.

---

## 1. Chạy Dự án Python (Backend)

Dự án sử dụng **FastAPI** và chạy mặc định tại cổng `8000`.

### Bước 1: Kích hoạt môi trường ảo (venv)
Mở Terminal (PowerShell) tại thư mục gốc dự án:
```powershell
.\venv\Scripts\activate
```

### Bước 2: Cài đặt thư viện (nếu cần)
```powershell
pip install -r requirements.txt
```

### Bước 3: Khởi động Server
```powershell
python3 src/main.py
```
*Lưu ý: Giữ cửa sổ terminal này luôn mở để backend hoạt động.*

---

## 2. Kết nối ra Internet (Tunneling)

Để Vercel (trên cloud) có thể gọi được API ở máy bạn (local), bạn cần dùng Tunnel.

### Cách A: Cloudflare Tunnel (Khuyên dùng)
1.  **Tải về:** [cloudflared.exe](https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe).
2.  **Chạy Quick Tunnel (Link ngẫu nhiên):**
    ```powershell
    & "đường\dẫn\đến\cloudflared.exe" tunnel --url http://localhost:8000
    ```

    ```
    & "D:\Vercel and Cloudfare\cloudflared-windows-amd64.exe" tunnel --url http://localhost:8000
    ```
3.  **Lấy link:** Tìm dòng `https://your-name.trycloudflare.com` trong terminal.

### Cách B: Ngrok
1.  **Tải & Đăng ký:** Tạo tài khoản tại [ngrok.com](https://ngrok.com/) để lấy `Authtoken`.
2.  **Thiết lập Token (Lần đầu):** 
    ```powershell
    ngrok config add-authtoken <YOUR_TOKEN>
    ```
3.  **Chạy Ngrok:**
    ```powershell
    ngrok http 8000
    ```
4.  **Lấy link:** Copy link `https://...ngrok-free.app`.

---

## 3. Triển khai lên Vercel (Frontend)

### Bước 1: Cài đặt & Đăng nhập
```powershell
npm install -g vercel
vercel login
```

### Bước 2: Deploy dự án
Tại thư mục `frontend`:
```powershell
cd frontend
vercel
```
*Làm theo hướng dẫn, đặt tên dự án bằng chữ thường hoàn toàn.*

### Bước 3: Thiết lập Biến môi trường (Cực kỳ quan trọng)
Mỗi khi có link Tunnel mới, bạn phải cập nhật để Frontend biết đường gọi API:
```powershell
vercel env add VITE_API_URL production --value "LINK_TUNNEL_CUA_BAN" --yes
```

### Bước 4: Cập nhật code & link lên Production
```powershell
vercel --prod
```

---

## 4. Cách chạy "Cố định link" (Không bao giờ phải đổi trên Vercel)

### Cách 1: Dùng Ngrok Static Domain (KHUYÊN DÙNG - Miễn phí & Không cần mua Domain)
Đây là cách tốt nhất nếu bạn không muốn bỏ tiền mua tên miền:
1.  Truy cập [ngrok.com](https://dashboard.ngrok.com/cloud-edge/domains).
2.  Nhấn **"Create Domain"** -> Ngrok sẽ cấp cho bạn 1 link cố định (ví dụ: `xyz-abc.ngrok-free.app`).
3.  Chạy lệnh sau tại máy:
    ```powershell
    ngrok http --domain=TEN-MIEN-CUA-BAN.ngrok-free.app 8000
    ```
4.  **Trên Vercel:** Bạn chỉ cần Set `VITE_API_URL` là link này **1 lần duy nhất**. Từ lần sau cứ bật lên là chạy.

### Cách 2: Dùng Cloudflare Named Tunnel (Dùng file tunnel_config.yaml - Cần có Domain)
Nếu bạn có tên miền riêng (ví dụ: `yourdomain.com`) đã trỏ về Cloudflare:
1.  **Cấu hình:** Sử dụng file `tunnel_config.yaml` trong dự án. Thay đổi `hostname` và `tunnel ID` của bạn.
2.  **Khởi động:**
    ```powershell
    cloudflared tunnel --config tunnel_config.yaml run
    ```
3.  Cách này chuyên nghiệp nhất, ổn định và bảo mật cao.

---

## 5. Quy trình khởi động nhanh (Startup Workflow)

Nếu bạn đã thiết lập **Cố định link** ở Bước 4, mỗi sáng thức dậy bạn chỉ cần:

1.  **Bật Backend:** `python src/main.py`.
2.  **Bật Tunnel:** Chạy lệnh Ngrok cố định (Cách 1) hoặc Cloudflare config (Cách 2).
3.  **Mở Web và dùng luôn.** Không cần vào Vercel chỉnh sửa gì nữa.

---

## 6. Lưu ý về Kiến trúc mới (Microservices)
Nếu bạn đã cấu hình dự án theo dạng Microservices (tách riêng Audio Service, Interview Service):
- **Port 8000:** Chạy Gateway (Đây là cổng duy nhất cần tunnel ra ngoài).
- **Port 8001/8002:** Chạy các service nội bộ (Chỉ cần chạy ở local, không cần tunnel).

---

## Mẹo nhỏ:
- Sử dụng `npm run dev` ở local để kiểm tra frontend trước khi đẩy lên Vercel.
- Nếu backend crash do lỗi Unicode trên Windows, hãy đảm bảo code không in trực tiếp ký tự tiếng Việt ra console bằng lệnh `print()`.
