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

---

## 7. Quản lý Vercel Nâng cao (Cập nhật Code & Kết nối Lại Domain)

> **Kiến thức từ thực tế:** Section này tổng hợp những gì học được khi migration toàn bộ frontend và re-deploy lên Vercel production (04/2026).

---

### 7.1. Kiểm tra trạng thái & dự án đang link

**Xem project hiện tại được link với Vercel nào:**
```powershell
# Trong thư mục frontend/
cat .vercel/project.json
```
Output trả về `projectId`, `orgId`, `projectName` — xác nhận xem đã link đúng project chưa.

**Xem danh sách tất cả deployments gần đây:**
```powershell
vercel ls
```
Hiển thị URL deployment, trạng thái (Ready/Error), và environment (Production/Preview).

---

### 7.2. Kết nối lại (Re-link) Vercel project

Nếu đã `clone` repo từ GitHub về máy mới và thư mục `frontend/.vercel/` chưa tồn tại:
```powershell
cd frontend
vercel link
```
Chọn: **"Link to existing project"** → chọn đúng tên project → thư mục `.vercel/` sẽ được tạo ra.

> **Lưu ý:** Nếu `.vercel/project.json` đã tồn tại (đã có từ repo clone về), thì **không cần** chạy `vercel link` — Vercel CLI đã biết project rồi.

---

### 7.3. Update code và deploy lên Production

**Luồng chuẩn (qua GitHub — Khuyên dùng):**
```powershell
# Từ thư mục gốc project (không phải frontend/)
git add frontend/
git commit -m "feat: mô tả thay đổi"
git push origin main
```
→ Vercel tự detect push mới và **tự build + deploy** (nếu project đã connect GitHub).

**Luồng thủ công (dùng Vercel CLI — khi cần force deploy ngay):**
```powershell
# Trong thư mục frontend/
vercel --prod --yes
```
- `--prod`: deploy lên môi trường Production (không phải Preview).
- `--yes`: bỏ qua tất cả confirm prompt.
- Kết quả: in ra URL deployment mới và confirm alias vào domain chính.

---

### 7.4. Xác nhận domain đã được update đúng

Sau khi deploy xong, Vercel CLI sẽ in ra 2 dòng quan trọng:
```
Production: https://ai-interview-system-team1-owee7831s-....vercel.app [17s]
Aliased:    https://ai-interview-system-cd.vercel.app [17s]
```
- **Production URL**: URL của deployment cụ thể lần này (thay đổi mỗi lần deploy).
- **Aliased**: Domain cố định của bạn — **đây là link chia sẻ cho người dùng**.

Nếu `Aliased` không xuất hiện hoặc trỏ sai, vào [vercel.com/dashboard](https://vercel.com/dashboard) → chọn project → **Settings > Domains** để kiểm tra.

---

### 7.5. Cập nhật biến môi trường VITE_API_URL khi backend thay đổi

Khi Cloudflare Tunnel khởi động lại, link tunnel sẽ **đổi ngẫu nhiên** (trừ khi dùng Named Tunnel). Cần cập nhật biến trên Vercel:

**Cách 1: Qua Vercel CLI**
```powershell
# Xóa biến cũ
vercel env rm VITE_API_URL production --yes

# Thêm biến mới
vercel env add VITE_API_URL production
# Nhập giá trị: https://your-new-tunnel.trycloudflare.com
```

**Cách 2: Qua Dashboard**
1. Vào [vercel.com](https://vercel.com) → chọn project.
2. **Settings → Environment Variables**.
3. Tìm `VITE_API_URL` → Edit → nhập link tunnel mới → Save.
4. **Sau khi đổi biến, phải redeploy mới có hiệu lực:**
```powershell
vercel --prod --yes
```

> ⚠️ **Quan trọng:** Vercel build tại server với `VITE_*` vars được **bake vào bundle** lúc build, không phải runtime. Nghĩa là đổi biến xong **bắt buộc phải build lại** (redeploy) thì frontend mới nhận URL mới.

---

### 7.6. File `.env.production` vs Vercel Dashboard

| | `.env.production` (local) | Vercel Dashboard |
|---|---|---|
| **Dùng khi** | Build local (`npm run build`) | Build trên Vercel |
| **Ưu tiên** | Thấp hơn | **Cao hơn** (override local) |
| **Nên commit?** | Có thể (không chứa secret) | N/A |

**Best practice:**
- File `.env.production` để lưu URL tunnel hiện tại cho test local.
- Vercel Dashboard env vars để lưu URL chính thức cho production.

---

### 7.7. Cấu trúc thư mục deploy (Root Directory)

Vì project có cả `backend/` và `frontend/`, Vercel chỉ cần build `frontend/`. Xác nhận cấu hình:

**Kiểm tra `vercel.json` hoặc `.vercel/project.json`:**
```powershell
cat frontend/.vercel/project.json
# Xem projectName có đúng không
```

Nếu cần thiết lập `rootDirectory` rõ ràng, tạo file `frontend/vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

---

### 7.8. Troubleshoot common errors

| Lỗi | Nguyên nhân | Cách fix |
|---|---|---|
| `Error: No Output Directory named "dist"` | Vercel không biết dùng Vite | Thêm `vercel.json` với `outputDirectory: "dist"` |
| Frontend load nhưng API fail (CORS) | `VITE_API_URL` sai hoặc tunnel chết | Kiểm tra tunnel đang chạy, cập nhật URL |
| Domain hiện deployment cũ | Chưa alias domain sang deployment mới | `vercel --prod --yes` lại |
| `Command "vercel" not found` | Chưa install Vercel CLI | `npm install -g vercel` |
| Build OK nhưng trang trắng khi refresh | React Router cần config rewrite | Thêm `rewrites` vào `vercel.json` (xem bên dưới) |

**Fix trang trắng khi refresh (SPA routing):**

Thêm vào `frontend/vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

### 7.9. Quy trình chuẩn khi có code mới cần deploy

```
1. Chỉnh sửa code trong frontend/src/
2. Test local: npm run dev   (http://localhost:5173)
3. Build check: npm run build   (kiểm tra không có lỗi)
4. Commit: git add frontend/ && git commit -m "mô tả"
5. Push: git push origin main   → Vercel auto-deploy
   HOẶC: vercel --prod --yes   → Deploy thủ công ngay
6. Kiểm tra: mở domain https://ai-interview-system-cd.vercel.app
```

