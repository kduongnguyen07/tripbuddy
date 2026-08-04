# 🇻🇳 TripBuddy

**Lập kế hoạch du lịch Việt Nam theo ngân sách — Trip planning optimized for your budget.**

TripBuddy là ứng dụng web full-stack giúp người dùng lên kế hoạch du lịch Việt Nam một cách tối ưu dựa trên ngân sách, số ngày, số người và sở thích cá nhân. Hệ thống sử dụng thuật toán tối ưu hóa (Linear Programming) để tự động phân bổ chi phí cho lưu trú, ẩm thực và hoạt động trải nghiệm.

## ✨ Tính năng chính

- **Tối ưu hóa lịch trình** — Tự động tạo kế hoạch du lịch tối ưu bằng thuật toán LP (PuLP) dựa trên ngân sách và sở thích
- **Gợi ý điểm đến** — Đề xuất điểm đến phù hợp nhất theo tiêu chí người dùng
- **Hoán đổi dịch vụ** — Thay đổi linh hoạt khách sạn, nhà hàng, hoạt động trong lịch trình mà vẫn giữ ngân sách
- **Bản đồ tương tác** — Hiển thị vị trí điểm đến trên bản đồ Leaflet
- **Xuất PDF** — Tải lịch trình du lịch dưới dạng PDF
- **Chế độ sáng/tối** — Giao diện hỗ trợ light/dark mode
- **Admin Dashboard** — Quản lý dữ liệu điểm đến và dịch vụ
- **5 điểm đến** — Hà Nội, Huế, Đà Nẵng, Đà Lạt, Phú Quốc

## 🏗️ Kiến trúc

```
┌─────────────────────────────┐
│     Frontend (React/Vite)   │
│   TypeScript + TailwindCSS  │
│        Port 3000            │
└─────────────┬───────────────┘
              │ REST API
┌─────────────▼───────────────┐
│    Backend (FastAPI/Python)  │
│   PuLP Optimizer + SQLAlchemy│
│        Port 8000            │
└─────────────┬───────────────┘
              │
┌─────────────▼───────────────┐
│   PostgreSQL (Neon) / SQLite │
│     + JSON Dataset (500+)   │
└─────────────────────────────┘
```

## 🛠️ Tech Stack

| Layer    | Công nghệ                                                    |
| -------- | ------------------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite, TailwindCSS 4, Framer Motion     |
| UI/UX    | Lucide Icons, Leaflet Maps, html2canvas, jsPDF, Confetti      |
| Backend  | Python, FastAPI, Pydantic, PuLP (Linear Programming)          |
| Database | PostgreSQL (Neon) / SQLite fallback, SQLAlchemy ORM           |
| Deploy   | Vercel (Serverless Python + Static Build)                     |

## 🚀 Cài đặt & Chạy

### Yêu cầu

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **npm** hoặc **yarn**

### 1. Clone repository

```bash
git clone https://github.com/kduongnguyen07/tripbuddy.git
cd tripbuddy
```

### 2. Frontend

```bash
# Cài dependencies
npm install

# Chạy dev server (mở tại http://localhost:3000)
npm run dev
```

### 3. Backend

```bash
# Tạo virtual environment (khuyến nghị)
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

# Cài dependencies
pip install -r requirements.txt

# Chạy server (mở tại http://127.0.0.1:8000)
python -m uvicorn backend.main:app --reload
```

API documentation (Swagger UI) có tại: http://127.0.0.1:8000/docs

### 4. Biến môi trường

Tạo file `.env` ở thư mục gốc (tùy chọn):

```env
# Database — mặc định fallback sang SQLite nếu không set
DATABASE_URL=postgresql://user:password@host:5432/dbname
# hoặc
POSTGRES_URL=postgresql://user:password@host:5432/dbname

# CORS origins (mặc định: http://localhost:3000)
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com

# Admin secret key cho các API bảo mật (seed, backup)
ADMIN_SECRET_KEY=your_secret_key_here

# Geocoding (required to populate service coordinates)
GEOCODER_BASE_URL=https://us1.locationiq.com/v1/search
GEOCODER_API_KEY=your_locationiq_api_key
GEOCODER_USER_AGENT=TripBuddy/1.0 (contact: you@example.com)
GEOCODER_ALLOWED_DESTINATIONS=HAN,HUE,DAD,DLD,PQC
GEOCODER_MAX_DISTANCE_KM=90
```

After applying `backend/migrations/001_service_coordinates.sql`, run the
geocoder once in dry-run mode and then with `--apply` to populate service
coordinates. Manual coordinate edits in the admin service form are stored as
`verified`. The default geocoder scope is limited to TripBuddy's five
destinations (Hà Nội, Huế, Đà Nẵng, Đà Lạt and Phú Quốc); each query is also
bounded around its destination center and checked again by distance before it
is stored. Keep the LocationIQ key on the backend only.

### Lấy LocationIQ Access Token

1. Mở [trang đăng ký LocationIQ](https://my.locationiq.com/register), tạo tài
   khoản và xác minh email.
2. Đăng nhập dashboard, mở tab **API Access Tokens** và bấm **Show Token**.
3. Sao chép token vào `GEOCODER_API_KEY` trong file `.env`. Không đặt token vào
   frontend hoặc các biến `VITE_*`.
4. Nếu backend production có IP tĩnh, nên giới hạn token theo IP trong phần
   **View/Update** của token. LocationIQ khuyến nghị dùng IP restriction cho
   request phát sinh từ server; không dùng cách này cho request trực tiếp từ
   trình duyệt.

Tài liệu chính thức: [lấy Access Token](https://docs.locationiq.com/docs/locationiq-access-token),
[bảo mật token](https://docs.locationiq.com/docs/authentication), và [Forward
Geocoding](https://docs.locationiq.com/docs/quickstart-convert-address-to-coordinates).

Sau khi điền token, chạy thử:

```powershell
.venv\Scripts\python.exe -m backend.geocode_services --limit 10
```

Nếu kết quả đúng, chạy toàn bộ các dịch vụ chưa có tọa độ:

```powershell
.venv\Scripts\python.exe -m backend.geocode_services --apply
```

## 📡 API Reference

### Public Endpoints

| Method | Endpoint                                  | Mô tả                                          |
| ------ | ----------------------------------------- | ----------------------------------------------- |
| GET    | `/api/v1/destinations`                    | Danh sách tất cả điểm đến kèm chi phí tối thiểu |
| POST   | `/api/v1/destinations/recommend`          | Gợi ý điểm đến phù hợp theo tiêu chí           |
| GET    | `/api/v1/destinations/{id}/similar`       | Tìm điểm đến tương tự                           |
| POST   | `/api/v1/plans/generate`                  | Tạo lịch trình tối ưu                           |
| POST   | `/api/v1/plans/swap-options`              | Lấy danh sách lựa chọn thay thế cho một dịch vụ |
| POST   | `/api/v1/plans/apply-swap`                | Áp dụng hoán đổi dịch vụ trong lịch trình       |

### Database Management Endpoints

| Method | Endpoint                                  | Mô tả                               |
| ------ | ----------------------------------------- | ------------------------------------ |
| GET    | `/api/v1/db/destinations`                 | Lấy danh sách điểm đến từ DB        |
| POST   | `/api/v1/db/destinations`                 | Tạo/cập nhật điểm đến               |
| DELETE | `/api/v1/db/destinations/{id}`            | Xóa điểm đến                        |
| GET    | `/api/v1/db/services`                     | Lấy danh sách dịch vụ               |
| POST   | `/api/v1/db/services`                     | Tạo/cập nhật dịch vụ                |
| DELETE | `/api/v1/db/services/{id}`                | Xóa dịch vụ                         |

### Admin Endpoints (yêu cầu header `X-Admin-Secret`)

| Method | Endpoint              | Mô tả                          |
| ------ | --------------------- | ------------------------------- |
| POST   | `/api/v1/db/seed`     | Seed lại dữ liệu vào database  |
| POST   | `/api/v1/db/backup`   | Xuất backup database dạng JSON  |

## 📁 Cấu trúc dự án

```
tripbuddy/
├── api/
│   └── index.py                 # Vercel serverless entry point
├── backend/
│   ├── main.py                  # FastAPI app & routes
│   ├── planner.py               # LP optimizer (PuLP)
│   ├── catalog.py               # Data catalog repository
│   ├── database.py              # SQLAlchemy engine & session
│   ├── models.py                # ORM models
│   ├── schemas.py               # Pydantic request/response schemas
│   ├── normalizer.py            # Data normalization utilities
│   ├── seed_db.py               # Database seeding script
│   ├── backup_db.py             # Database backup script
│   └── tripbuddy_full_dataset_500.json  # Dataset gốc (500+ dịch vụ)
├── src/
│   ├── App.tsx                  # Main React app
│   ├── main.tsx                 # React entry point
│   ├── index.css                # Global styles
│   ├── components/
│   │   ├── admin/               # Admin dashboard & login
│   │   ├── common/              # Shared UI components
│   │   ├── destination/         # Destination detail views
│   │   ├── itinerary/           # Itinerary builder & result
│   │   ├── layout/              # Navbar, footer
│   │   └── sections/            # Landing page sections
│   ├── config/                  # App configuration
│   ├── context/                 # React Context (DataProvider)
│   ├── data/                    # Static data
│   ├── services/                # API service layer
│   ├── types/                   # TypeScript type definitions
│   └── utils/                   # Utility functions
├── index.html                   # HTML entry point
├── package.json                 # Node.js dependencies & scripts
├── requirements.txt             # Python dependencies
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite build configuration
└── vercel.json                  # Vercel deployment configuration
```

## 🌐 Deploy lên Vercel

Dự án đã được cấu hình sẵn cho Vercel với `vercel.json`:

1. Import repository vào [Vercel](https://vercel.com)
2. Cài đặt biến môi trường (`DATABASE_URL`, `ADMIN_SECRET_KEY`)
3. Deploy — Vercel sẽ tự động build frontend (Vite) và chạy backend (Serverless Python)

## 📜 Scripts

```bash
npm run dev       # Chạy frontend dev server
npm run build     # Build production (TypeScript check + Vite build)
npm run preview   # Preview production build
```

## 📄 License

MIT
