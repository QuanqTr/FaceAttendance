# 🕐 FaceTimekeeping - Hệ thống chấm công bằng khuôn mặt

## 📋 Tổng quan dự án
Hệ thống chấm công hiện đại sử dụng công nghệ nhận diện khuôn mặt, được xây dựng với React, Node.js, và PostgreSQL.

## ✨ Tính năng chính

### 🚀 Chấm công cơ bản
- ✅ Nhận diện khuôn mặt thời gian thực
- ✅ Check-in/Check-out tự động
- ✅ Quản lý nhân viên và phòng ban
- ✅ Xử lý ca làm việc linh hoạt

### 📊 **HỆ THỐNG BÁO CÁO VÀ THỐNG KÊ HOÀN CHỈNH**

#### 🎯 **6 Tab Báo cáo Chi tiết:**

##### 1. **📈 Tổng quan (Overview)**
- **Thẻ thống kê nhanh:**
  - 👥 Tổng nhân viên (full-time, part-time, nghỉ việc)
  - ⏰ Tổng giờ làm việc với thanh tiến độ
  - 🔥 Giờ tăng ca với tỷ lệ phần trăm
  - ⚠️ Tổng tiền phạt và phút đi muộn

- **Bảng xếp hạng phòng ban:**
  - 🥇🥈🥉 Top 5 phòng ban hiệu quả nhất
  - Hiển thị số nhân viên và tổng giờ làm
  - Badge màu sắc theo thứ hạng

- **Phân tích vi phạm trực quan:**
  - Biểu đồ tròn phân loại mức độ phạt
  - Thống kê nhân viên bị/không bị phạt

##### 2. **📊 Xu hướng (Trends)**
- **Biểu đồ xu hướng giờ làm năm:**
  - Area chart hiển thị tổng giờ và tăng ca theo tháng
  - Tooltip với định dạng giờ:phút

- **Xu hướng vi phạm:**
  - Line chart theo dõi tiền phạt theo tháng
  - Màu đỏ nổi bật cho dễ nhận biết

- **Phân tích so sánh:**
  - Bar chart so sánh số nhân viên, giờ TB, ngày nghỉ
  - Dữ liệu 12 tháng trong năm

##### 3. **📈 Biểu đồ (Charts)**
- **Giờ làm theo phòng ban:**
  - Bar chart với màu sắc đa dạng
  - Rotation text cho tên phòng ban dài
  - Nút xuất CSV tích hợp

- **Phân bố loại nhân viên:**
  - Pie chart với màu sắc chuẩn
  - Thống kê chi tiết dưới biểu đồ

- **So sánh giờ thường vs tăng ca:**
  - Grouped bar chart
  - Dễ dàng so sánh hiệu suất

- **Phân bố tiền phạt:**
  - Bar chart màu đỏ gradient
  - Tooltip hiển thị VND format

##### 4. **📋 Chấm công (Attendance)**
- **Bảng chi tiết chấm công:**
  - ✅ Filtering theo phòng ban
  - 🏷️ Badge status cho đánh giá
  - 💰 Format tiền tệ VND
  - ⏱️ Format giờ:phút chuẩn

- **4 thẻ tổng kết nhanh:**
  - Tổng bản ghi, giờ làm, tăng ca, tiền phạt

- **Tính năng xuất dữ liệu:**
  - 📊 Xuất Excel/CSV
  - 🔍 Lọc theo phòng ban

##### 5. **🏆 Top nhân viên (Performers)**
- **Top 10 nhân viên xuất sắc:**
  - 🥇🥈🥉 Badge xếp hạng với màu vàng/bạc/đồng
  - Progress bar hiệu suất
  - Card design hiện đại với gradient

- **3 thẻ thống kê tổng quan:**
  - 👑 Nhân viên xuất sắc nhất
  - 📊 Giờ làm trung bình top 10
  - ✅ Số lượng không vi phạm

- **Thông tin chi tiết mỗi nhân viên:**
  - Tổng giờ làm với font size lớn
  - Giờ tăng ca (nếu có)
  - Trạng thái vi phạm
  - Indicators hiệu suất

##### 6. **⚠️ Phân tích phạt (Penalties)**
- **4 thẻ thống kê vi phạm:**
  - 🔴 Số nhân viên vi phạm
  - ⏰ Tổng phút đi muộn
  - 🏃 Tổng phút về sớm  
  - 💸 Tổng tiền phạt

- **Phân loại mức độ phạt:**
  - 🟢 Không phạt
  - 🟡 Phạt nhẹ (≤50k)
  - 🟠 Phạt trung bình (≤100k)
  - 🔴 Phạt nặng (>100k)

- **Bảng chi tiết vi phạm:**
  - Badge màu sắc theo mức độ
  - Emoji đánh giá trực quan
  - Sort theo tiền phạt giảm dần

#### 🎨 **Tính năng UX/UI nâng cao:**
- **🎯 Responsive Design:** Tự động responsive trên mọi thiết bị
- **🎨 Hover Effects:** Card shadow, button transitions mượt mà
- **🌈 Color Theme:** Màu sắc nhất quán theo mức độ (xanh/vàng/cam/đỏ)
- **📱 Mobile Friendly:** Grid layout tự động điều chỉnh
- **⚡ Loading States:** Skeleton loading cho mọi component
- **🔄 Auto Refresh:** Nút làm mới tất cả dữ liệu
- **📤 Export Functions:** Xuất CSV, JSON, Excel đa dạng

#### 🔧 **Backend API hoàn chỉnh:**
```
GET /api/reports/overall-stats          # Thống kê tổng quan
GET /api/reports/department-stats       # Thống kê phòng ban  
GET /api/reports/monthly-attendance     # Chi tiết chấm công
GET /api/reports/top-performers         # Top nhân viên
GET /api/reports/penalty-analysis       # Phân tích vi phạm
GET /api/reports/attendance-trends      # Xu hướng theo tháng
```

#### 📊 **Filter và Export:**
- **Bộ lọc linh hoạt:** Tháng, năm, phòng ban
- **Xuất báo cáo:** CSV, JSON, Excel
- **Làm mới dữ liệu:** Real-time refresh
- **Báo cáo tổng hợp:** Export toàn bộ JSON

### 🔐 Phân quyền người dùng
- **Admin:** Toàn quyền quản lý + báo cáo chi tiết
- **Manager:** Quản lý nhân viên + xem báo cáo
- **Employee:** Chấm công cá nhân + xem lịch sử

### 🛡️ Bảo mật
- JWT Authentication
- bcrypt Password hashing  
- CORS protection
- Rate limiting

## 🚀 Cài đặt và chạy

### Yêu cầu hệ thống
- Node.js 18+
- PostgreSQL 14+
- npm/yarn

### Cài đặt
```bash
# Clone repository
git clone <repo-url>
cd FaceTimekeeping

# Cài đặt dependencies
npm install

# Cấu hình database
cp .env.example .env
# Chỉnh sửa .env với thông tin database

# Chạy migrations
npm run migrate

# Khởi động development
npm run dev
```

### Build production
```bash
npm run build
npm start
```

## 📁 Cấu trúc thư mục

```
FaceTimekeeping/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/
│   │   │   └── reports.tsx # 🔥 HỆ THỐNG BÁO CÁO HOÀN CHỈNH
│   │   ├── components/
│   │   ├── lib/
│   │   └── index.css      # Custom styles cho reports
├── server/                # Backend Node.js
│   ├── controllers/
│   │   └── reportController.ts # 🔥 API BÁO CÁO HOÀN CHỈNH
│   ├── routes/
│   ├── models/
│   └── utils/
├── shared/               # Schema chung
└── docs/                # Tài liệu
```

## 🎯 Roadmap tính năng

### ✅ Đã hoàn thành
- [x] Nhận diện khuôn mặt cơ bản
- [x] Quản lý nhân viên/phòng ban  
- [x] **HỆ THỐNG BÁO CÁO HOÀN CHỈNH 6 TABS**
- [x] **DASHBOARD THỐNG KÊ TRỰC QUAN**
- [x] **EXPORT DỮ LIỆU ĐA DẠNG**
- [x] Responsive design
- [x] Authentication & Authorization

### 🔄 Đang phát triển  
- [ ] Mobile app companion
- [ ] AI phân tích xu hướng
- [ ] Integration với HR systems
- [ ] Advanced face recognition

## 🤝 Đóng góp
Mọi đóng góp đều được chào đón! Vui lòng tạo issue hoặc pull request.

## 📞 Liên hệ
- **Developer:** [Tên của bạn]
- **Email:** [Email của bạn]
- **Demo:** [Link demo nếu có]

---

## 🌟 **HIGHLIGHTS - Tính năng nổi bật**

### 📊 **Hệ thống báo cáo cấp doanh nghiệp**
Đây là **tính năng đặc biệt** của dự án với:
- ✨ **6 dashboard tabs** hoàn chỉnh
- 🎨 **15+ biểu đồ** đa dạng (Bar, Line, Area, Pie)
- 📱 **100% responsive** design  
- 🚀 **Real-time data** với filtering thông minh
- 📤 **Multi-format export** (CSV, Excel, JSON)
- 🎯 **Professional UX/UI** với animations mượt mà

**Hệ thống này có thể đáp ứng nhu cầu báo cáo của doanh nghiệp từ 50-1000+ nhân viên!**

---

⭐ **Nếu dự án hữu ích, hãy star repository này!** 