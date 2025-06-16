#  Face Attendance System

Hệ thống chấm công bằng nhận diện khuôn mặt hiện đại với giao diện tiếng Việt, được xây dựng bằng React, Node.js và Face-API.js.

## 📋 Tổng quan

Face Attendance System là một ứng dụng web toàn diện cho việc quản lý chấm công nhân viên sử dụng công nghệ nhận diện khuôn mặt. Hệ thống hỗ trợ nhiều vai trò người dùng và cung cấp dashboard trực quan để theo dõi, quản lý chấm công.

## ✨ Tính năng chính

### 🔐 Xác thực & Phân quyền
- **Đăng nhập an toàn** với session-based authentication
- **3 vai trò người dùng**: Admin, Manager, Employee
- **Xác thực email** cho tài khoản mới
- **Quản lý mật khẩu** và bảo mật tài khoản

### 👤 Nhận diện khuôn mặt
- **Chấm công real-time** bằng camera web
- **Đăng ký khuôn mặt** cho nhân viên mới
- **Thuật toán Face-API.js** với độ chính xác cao
- **Chụp ảnh tự động** khi chấm công thành công
- **Lưu trữ Firebase** cho dữ liệu ảnh chấm công

### 📊 Dashboard & Báo cáo
- **Admin Dashboard**: Tổng quan toàn hệ thống
- **Manager Dashboard**: Quản lý phòng ban được phân công
- **Employee Dashboard**: Thông tin cá nhân và lịch sử chấm công
- **Báo cáo chi tiết**: Xuất Excel, PDF với nhiều loại thống kê
- **Biểu đồ trực quan**: Charts và graphs cho dữ liệu chấm công

### 👥 Quản lý nhân viên
- **CRUD nhân viên**: Tạo, sửa, xóa thông tin nhân viên
- **Quản lý phòng ban**: Phân chia theo bộ phận
- **Lịch sử chấm công**: Theo dõi chi tiết từng nhân viên
- **Quản lý nghỉ phép**: Đơn xin nghỉ và phê duyệt

### 📈 Thống kê & Phân tích
- **Thống kê theo thời gian**: Ngày, tuần, tháng
- **Phân tích hiệu suất**: Tỷ lệ đi muộn, vắng mặt
- **Top performers**: Xếp hạng nhân viên xuất sắc
- **Penalty analysis**: Phân tích vi phạm và kỷ luật

## 🛠️ Công nghệ sử dụng

### Frontend
- **React 18** với TypeScript
- **Vite** - Build tool hiện đại
- **TailwindCSS** - Styling framework
- **Shadcn/ui** - Component library
- **TanStack Query** - Data fetching
- **Face-API.js** - Face recognition
- **Recharts** - Data visualization
- **i18next** - Internationalization

### Backend
- **Node.js** với Express.js
- **TypeScript** - Type safety
- **Drizzle ORM** - Database ORM
- **PostgreSQL** - Primary database
- **Firebase** - Image storage
- **Passport.js** - Authentication
- **Express Session** - Session management

### DevOps & Tools
- **Vite** - Development server
- **ESBuild** - Fast bundling
- **Drizzle Kit** - Database migrations
- **Cross-env** - Environment variables

## 📁 Cấu trúc dự án

```
FaceAttendance/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilities & configs
│   │   └── styles/        # CSS files
│   └── public/            # Static assets
├── server/                # Backend Node.js app
│   ├── controllers/       # Route handlers
│   ├── routes/           # API routes
│   ├── models/           # Data models
│   ├── middlewares/      # Express middlewares
│   ├── utils/            # Helper functions
│   └── config/           # Configuration files
├── shared/               # Shared types & schemas
└── migrations/           # Database migrations
```

## 🚀 Cài đặt & Chạy dự án

### Yêu cầu hệ thống
- **Node.js** >= 18.0.0
- **PostgreSQL** >= 13.0
- **npm** hoặc **yarn**

### 1. Clone repository
```bash
git clone <repository-url>
cd FaceAttendance
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình môi trường
Tạo file `.env` trong thư mục root:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/face_attendance"

# Session
SESSION_SECRET="your-secret-key"

# Firebase (optional)
FIREBASE_PROJECT_ID="your-firebase-project"
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL="your-client-email"

# Server
PORT=5000
NODE_ENV=development
```

### 4. Thiết lập database
```bash
# Push database schema
npm run db:push

# Chạy migrations (nếu có)
npx drizzle-kit migrate
```

### 5. Chạy ứng dụng
```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Ứng dụng sẽ chạy tại: `http://localhost:5000`

## 🎮 Sử dụng hệ thống

### Đăng nhập lần đầu
1. Truy cập `http://localhost:5000`
2. Sử dụng tài khoản admin mặc định hoặc tạo tài khoản mới
3. Thiết lập thông tin cơ bản cho hệ thống

### Chấm công bằng khuôn mặt
1. Truy cập `http://localhost:5000/face-recognition-live`
2. Cho phép truy cập camera
3. Đưa khuôn mặt vào khung hình
4. Hệ thống sẽ tự động nhận diện và chấm công

### Quản lý nhân viên
1. Đăng nhập với quyền Admin/Manager
2. Vào mục "Quản lý nhân viên"
3. Thêm nhân viên mới và đăng ký khuôn mặt
4. Phân quyền và gán phòng ban

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/me` - Thông tin user hiện tại

### Face Recognition
- `POST /api/face-recognition` - Nhận diện khuôn mặt
- `POST /api/face-data` - Upload dữ liệu khuôn mặt
- `GET /api/employees/with-face` - Danh sách nhân viên có face data

### Time Logs
- `POST /api/time-logs` - Tạo log chấm công
- `GET /api/time-logs` - Lấy danh sách time logs
- `PUT /api/time-logs/:id` - Cập nhật time log

### Reports
- `GET /api/admin/reports` - Báo cáo admin
- `GET /api/manager/reports` - Báo cáo manager
- `GET /api/reports/export` - Xuất báo cáo

## 🔧 Cấu hình nâng cao

### Face Recognition Settings
- Threshold độ chính xác: 0.6 (có thể điều chỉnh)
- Model sử dụng: tinyFaceDetector
- Kích thước ảnh training: 150x150px

### Database Optimization
- Connection pooling với pg-pool
- Query optimization với Drizzle ORM
- Indexing cho các trường tìm kiếm thường xuyên

### Security Features
- CSRF protection
- Rate limiting
- Input validation với Zod
- Secure session configuration

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📞 Hỗ trợ

Nếu bạn gặp vấn đề hoặc có câu hỏi:
- Tạo issue trên GitHub
- Email: mynameisquanq@gmail.com

---

**Phát triển bởi**: Trần Đại Quang
**Phiên bản**: 2.0.0  
**Cập nhật lần cuối**: Tháng 6, 2025
