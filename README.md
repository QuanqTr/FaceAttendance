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
- `POST /api/login` - Đăng nhập
- `POST /api/logout` - Đăng xuất
- `GET /api/user` - Thông tin user hiện tại
- `POST /api/forgot-password` - Quên mật khẩu
- `POST /api/face-auth/send-verification` - Gửi mã xác thực nhận diện khuôn mặt
- `POST /api/face-auth/verify-code` - Xác thực mã nhận diện khuôn mặt

### Employees
- `GET /api/employees/generate-id` - Tạo ID nhân viên mới
- `GET /api/employees` - Lấy danh sách nhân viên (có phân trang và lọc)
- `GET /api/employeeall` - Lấy tất cả nhân viên (không phân trang)
- `GET /api/employees/with-face-descriptor` - Lấy nhân viên có face descriptor
- `GET /api/employees/:id` - Lấy thông tin nhân viên theo ID
- `POST /api/employees` - Tạo nhân viên mới
- `PUT /api/employees/:id` - Cập nhật thông tin nhân viên
- `DELETE /api/employees/:id` - Xóa nhân viên

### Face Recognition
- `GET /api/employees/:id/face` - Kiểm tra trạng thái face descriptor của nhân viên
- `PUT /api/employees/:id/face` - Cập nhật face descriptor của nhân viên
- `DELETE /api/employees/:id/face` - Xóa face descriptor của nhân viên
- `POST /api/employees/:id/face-profile` - Upload ảnh khuôn mặt và lưu profile
- `GET /api/employees/:id/face-data` - Lấy dữ liệu khuôn mặt của nhân viên
- `DELETE /api/employees/:employeeId/face-data` - Reset dữ liệu khuôn mặt của nhân viên
- `POST /api/face-recognition` - Nhận diện khuôn mặt cho chấm công
- `POST /api/face-recognition/verify` - Xác thực nhận diện khuôn mặt
- `POST /api/face-registration` - Đăng ký khuôn mặt
- `POST /api/face-recognition/log` - Ghi log nhận diện khuôn mặt
- `GET /api/face-recognition/logs/employee/:employeeId` - Lấy log nhận diện khuôn mặt của nhân viên

### Departments
- `GET /api/departments` - Lấy tất cả phòng ban
- `GET /api/departments/:id` - Lấy thông tin phòng ban theo ID
- `POST /api/departments` - Tạo phòng ban mới
- `PUT /api/departments/:id` - Cập nhật thông tin phòng ban
- `DELETE /api/departments/:id` - Xóa phòng ban

### Users/Accounts
- `GET /api/users` - Lấy tất cả người dùng
- `GET /api/accounts` - Lấy tất cả tài khoản (alias cho users)
- `GET /api/users/:id` - Lấy thông tin người dùng theo ID
- `POST /api/users` - Tạo người dùng mới
- `PUT /api/users/:id` - Cập nhật thông tin người dùng
- `PUT /api/users/:id/password` - Cập nhật mật khẩu người dùng
- `PATCH /api/users/:id/password` - Cập nhật mật khẩu người dùng (alias)
- `DELETE /api/users/:id` - Xóa người dùng
- `GET /api/users/:id/face-profile` - Lấy profile khuôn mặt của người dùng
- `POST /api/users/:id/face-profile` - Cập nhật profile khuôn mặt của người dùng
- `DELETE /api/users/:id/face-profile` - Xóa profile khuôn mặt của người dùng

### Leave Requests
- `GET /api/leave-requests` - Lấy tất cả yêu cầu nghỉ phép
- `GET /api/leave-requests/count` - Đếm số lượng yêu cầu nghỉ phép
- `POST /api/leave-requests` - Tạo yêu cầu nghỉ phép mới
- `GET /api/leave-requests/:id` - Lấy chi tiết yêu cầu nghỉ phép theo ID
- `GET /api/leave-requests/employee/:employeeId` - Lấy yêu cầu nghỉ phép của nhân viên

### Attendance
- `GET /api/attendance-summary` - Lấy tổng hợp chấm công
- `POST /api/attendance-summary/update` - Cập nhật tổng hợp chấm công
- `POST /api/time-logs` - Tạo log chấm công
- `GET /api/time-logs` - Lấy danh sách time logs
- `PUT /api/time-logs/:id` - Cập nhật time log

### Work Hours
- `POST /api/work-hours` - Cập nhật giờ làm việc
- `GET /api/work-hours/daily` - Lấy giờ làm việc hàng ngày
- `PUT /api/work-hours/:id` - Cập nhật giờ làm việc theo ID
- `DELETE /api/work-hours/:id` - Xóa giờ làm việc theo ID
- `GET /api/work-hours/employee/:employeeId` - Lấy giờ làm việc của nhân viên

### Manager Endpoints
- `GET /api/manager/department-info` - Lấy thông tin phòng ban của manager
- `GET /api/manager/departments` - Lấy phòng ban của manager
- `GET /api/manager/pending-counts` - Đếm số lượng phê duyệt đang chờ
- `GET /api/manager/employees` - Lấy nhân viên trong phòng ban của manager
- `GET /api/manager/employees/:id` - Lấy thông tin nhân viên trong phòng ban
- `POST /api/manager/employees` - Tạo nhân viên mới trong phòng ban
- `PUT /api/manager/employees/:id` - Cập nhật nhân viên trong phòng ban
- `DELETE /api/manager/employees/:id` - Xóa nhân viên trong phòng ban
- `GET /api/manager/attendance` - Lấy dữ liệu chấm công của phòng ban

### Statistics
- `GET /api/stats/departments` - Thống kê chấm công theo phòng ban
- `GET /api/stats/daily` - Thống kê hàng ngày
- `GET /api/stats/weekly` - Thống kê hàng tuần
- `GET /api/stats/monthly` - Xu hướng hàng tháng
- `GET /api/manager/stats/daily` - Thống kê hàng ngày cho manager
- `GET /api/manager/stats/weekly` - Thống kê hàng tuần cho manager
- `GET /api/manager/stats/department` - Thống kê phòng ban cho manager
- `GET /api/manager/stats/top-performers` - Lấy nhân viên xuất sắc nhất
- `GET /api/manager/stats/department-overall` - Tổng quan phòng ban
- `GET /api/manager/stats/attendance-records` - Bản ghi chấm công
- `GET /api/manager/stats/team-performance` - Hiệu suất nhóm
- `GET /api/manager/stats/penalty-analysis` - Phân tích phạt

### Reports
- `POST /api/reports/export` - Xuất báo cáo
- `GET /api/reports/attendance-summary` - Báo cáo tổng hợp chấm công
- `GET /api/reports/statistics` - Báo cáo thống kê
- `GET /api/reports/department-summary` - Báo cáo tổng hợp phòng ban
- `GET /api/reports/monthly-attendance` - Báo cáo chấm công hàng tháng
- `GET /api/reports/department-stats` - Thống kê phòng ban
- `GET /api/reports/overall-stats` - Thống kê tổng quan
- `GET /api/reports/top-performers` - Nhân viên xuất sắc nhất
- `GET /api/reports/employee/:employeeId/performance` - Hiệu suất của nhân viên

### Admin Endpoints
- `GET /api/admin/company-info` - Lấy thông tin công ty
- `PUT /api/admin/company-settings` - Cập nhật cài đặt công ty
- `GET /api/admin/system-settings` - Lấy cài đặt hệ thống
- `PUT /api/admin/system-settings` - Cập nhật cài đặt hệ thống
- `GET /api/admin/notification-settings` - Lấy cài đặt thông báo
- `PUT /api/admin/notification-settings` - Cập nhật cài đặt thông báo

### Screenshots
- `POST /api/screenshots/attendance` - Lưu ảnh chụp màn hình chấm công vào Firebase
- `GET /api/screenshots/attendance` - Lấy ảnh chụp màn hình chấm công từ Firebase

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
