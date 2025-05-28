# 📊 Hướng dẫn sử dụng Hệ thống Báo cáo

## 🎯 Tổng quan
Hệ thống báo cáo FaceTimekeeping cung cấp 6 dashboard chuyên sâu để phân tích dữ liệu chấm công một cách toàn diện và chuyên nghiệp.

## 🚀 Truy cập Báo cáo
1. Đăng nhập với quyền **Admin** hoặc **Manager**
2. Vào menu **"Báo cáo"** từ sidebar
3. Chọn tháng/năm và phòng ban cần xem
4. Khám phá 6 tab báo cáo khác nhau

---

## 📈 Tab 1: TỔNG QUAN (Overview)

### 🎯 Mục đích
Cung cấp cái nhìn tổng thể về hiệu suất chấm công của toàn công ty trong tháng được chọn.

### 📊 Các thông tin hiển thị

#### **Thẻ thống kê nhanh (4 cards):**
1. **👥 Tổng nhân viên**
   - Số lượng nhân viên tổng cộng
   - Phân loại: Full-time, Part-time, Nghỉ việc
   - Thanh tiến độ hiển thị tỷ lệ

2. **⏰ Tổng giờ làm**
   - Tổng giờ làm việc toàn công ty
   - Trung bình giờ làm/nhân viên
   - Progress bar so với mục tiêu (180h/tháng)

3. **🔥 Giờ tăng ca**
   - Tổng giờ tăng ca toàn công ty
   - Trung bình tăng ca/nhân viên  
   - % tăng ca so với tổng giờ làm

4. **⚠️ Tổng phạt**
   - Tổng tiền phạt (VND)
   - Trung bình phạt/nhân viên
   - Tổng phút đi muộn

#### **Bảng xếp hạng phòng ban:**
- 🥇🥈🥉 Top 5 phòng ban hiệu quả nhất
- Hiển thị: Tên phòng ban, số nhân viên, tổng giờ làm
- Badge màu vàng/bạc/đồng cho top 3

#### **Phân tích vi phạm:**
- Biểu đồ tròn phân loại mức độ phạt
- Thống kê số lượng nhân viên bị/không bị phạt
- 4 mức độ: Không phạt, Phạt nhẹ, Phạt TB, Phạt nặng

### 💡 Cách sử dụng
- Sử dụng để đánh giá tổng thể hiệu suất công ty
- So sánh các phòng ban với nhau
- Xác định các vấn đề về kỷ luật (phạt, đi muộn)

---

## 📊 Tab 2: XU HƯỚNG (Trends)

### 🎯 Mục đích
Phân tích xu hướng biến đổi của các chỉ số chấm công theo thời gian (theo tháng trong năm).

### 📈 Các biểu đồ

#### **1. Xu hướng giờ làm năm [selectedYear]**
- **Loại:** Area Chart (biểu đồ vùng)
- **Dữ liệu:** 
  - Tổng giờ làm (màu xanh dương)
  - Tổng giờ tăng ca (màu xanh lá)
- **Trục X:** Tháng (T1 đến T12)
- **Trục Y:** Số giờ
- **Tooltip:** Hiển thị giờ:phút format

#### **2. Xu hướng vi phạm năm [selectedYear]**
- **Loại:** Line Chart (biểu đồ đường)
- **Dữ liệu:** Tổng tiền phạt theo tháng
- **Màu sắc:** Đỏ (#ef4444)
- **Điểm nổi bật:** Dots tại mỗi tháng
- **Tooltip:** Format VND

#### **3. Phân tích so sánh các tháng**
- **Loại:** Bar Chart (biểu đồ cột)
- **Dữ liệu:**
  - Số nhân viên (màu xanh dương)
  - Giờ TB/người (màu xanh lá) 
  - Ngày nghỉ (màu vàng)
- **Tooltip:** Hiển thị đơn vị phù hợp

### 💡 Cách sử dụng
- Xác định tháng nào có hiệu suất cao/thấp
- Phát hiện xu hướng tăng/giảm vi phạm
- So sánh các tháng với nhau để tìm patterns
- Dự đoán xu hướng tương lai

---

## 📈 Tab 3: BIỂU ĐỒ (Charts)

### 🎯 Mục đích
Cung cấp các biểu đồ chuyên sâu để phân tích dữ liệu theo nhiều góc độ khác nhau.

### 📊 4 Biểu đồ chính

#### **1. Giờ làm theo phòng ban**
- **Loại:** Bar Chart với màu sắc đa dạng
- **Tính năng:**
  - Text xoay 45° cho tên phòng ban dài
  - Tooltip hiển thị giờ:phút format
  - Nút **Download** để xuất CSV
- **Sử dụng:** So sánh hiệu suất các phòng ban

#### **2. Phân bố loại nhân viên**
- **Loại:** Pie Chart + thống kê chi tiết
- **3 loại:** Full-time (xanh lá), Part-time (xanh dương), Nghỉ việc (đỏ)
- **Thêm:** 3 thẻ thống kê bên dưới
- **Sử dụng:** Hiểu cơ cấu nhân sự công ty

#### **3. So sánh giờ thường vs tăng ca**
- **Loại:** Grouped Bar Chart
- **2 cột:** Giờ làm thường + Giờ tăng ca trung bình
- **Sử dụng:** Đánh giá mức độ tăng ca của từng phòng ban

#### **4. Phân bố tiền phạt theo phòng ban**
- **Loại:** Bar Chart màu đỏ gradient
- **Tooltip:** Format VND
- **Sử dụng:** Xác định phòng ban có nhiều vi phạm

### 🔧 Tính năng Export
- Nút **Download** trên mỗi biểu đồ
- Export CSV với tên file có format: `[tên-bieu-do]-[thang]-[nam].csv`

---

## 📋 Tab 4: CHẤM CÔNG (Attendance)

### 🎯 Mục đích
Hiển thị bảng chi tiết từng bản ghi chấm công của nhân viên trong tháng được chọn.

### 📊 Thông tin hiển thị

#### **Header thông tin:**
- Tổng số bản ghi hiển thị
- Phòng ban đang filter (nếu có)
- 2 nút: **Xuất Excel** và **Xuất CSV**

#### **4 thẻ tổng kết:**
1. **Tổng bản ghi:** Số bản ghi chấm công
2. **Tổng giờ làm:** Tổng giờ toàn bộ nhân viên  
3. **Tổng tăng ca:** Tổng giờ tăng ca
4. **Tổng phạt:** Tổng tiền phạt (VND)

#### **Bảng chi tiết (10 cột):**
1. **Nhân viên:** Tên + ID
2. **Phòng ban:** Badge với tên phòng ban
3. **Chức vụ:** Vị trí công việc
4. **Giờ làm:** Format giờ:phút
5. **Tăng ca:** Màu cam nếu > 0
6. **Nghỉ phép:** Số ngày nghỉ
7. **Đi muộn:** Màu đỏ nếu > 0, hiển thị phút
8. **Về sớm:** Màu đỏ nếu > 0, hiển thị phút  
9. **Tiền phạt:** Màu đỏ/xanh, format VND
10. **Đánh giá:** Badge màu (Xuất sắc/Bình thường/Cần cải thiện)

### 🔍 Tính năng Filter
- **Dropdown phòng ban:** "Tất cả phòng ban" hoặc chọn phòng ban cụ thể
- **Auto-update:** Bảng tự động cập nhật khi thay đổi filter

### 📤 Export Options
- **Xuất Excel:** Định dạng .xlsx
- **Xuất CSV:** Định dạng .csv
- **Tên file:** `cham-cong-[thang]-[nam].csv`

---

## 🏆 Tab 5: TOP NHÂN VIÊN (Performers)

### 🎯 Mục đích
Xếp hạng và vinh danh top 10 nhân viên có hiệu suất làm việc xuất sắc nhất.

### 🏅 Tiêu chí xếp hạng
- **Chính:** Tổng giờ làm việc cao nhất
- **Phụ:** Ít vi phạm, ít đi muộn

### 📊 Hiển thị thông tin

#### **3 thẻ tổng quan:**
1. **👑 Nhân viên xuất sắc nhất:**
   - Tên và số giờ làm của #1
   - Background gradient vàng

2. **📊 Giờ làm trung bình:**
   - Trung bình giờ làm của top 10
   - Background gradient xanh

3. **✅ Không vi phạm:**
   - Số nhân viên trong top 10 không bị phạt
   - Background gradient xanh lá

#### **Danh sách top 10:**
Mỗi card nhân viên bao gồm:

**🏅 Badge xếp hạng:**
- **#1:** 🥇 Hạng 1 (vàng)
- **#2:** 🥈 Hạng 2 (bạc)  
- **#3:** 🥉 Hạng 3 (đồng)
- **#4-10:** Badge xanh dương

**📋 Thông tin chi tiết:**
- **Tên nhân viên:** Font lớn, đậm
- **Chức vụ:** Font nhỏ
- **Phòng ban:** Badge outline
- **Tổng giờ làm:** Số lớn màu xanh dương
- **Giờ tăng ca:** Hiển thị nếu > 0, màu cam
- **Tiền phạt:** Hiển thị nếu > 0, màu đỏ, hoặc badge "Không vi phạm"

**🎨 Thiết kế nâng cao:**
- **Progress bar:** Thanh tiến độ bên dưới card
- **Hover effects:** Card shadow khi hover
- **Gradient background:** Màu sắc theo thứ hạng

### 📤 Export
- Nút **Xuất danh sách** để download CSV
- File: `top-performers-[thang]-[nam].csv`

### 💡 Cách sử dụng
- Ghi nhận và vinh danh nhân viên xuất sắc
- Phân tích yếu tố tạo nên hiệu suất cao
- Đặt làm mục tiêu cho nhân viên khác

---

## ⚠️ Tab 6: PHÂN TÍCH PHẠT (Penalties)

### 🎯 Mục đích
Phân tích chi tiết các vi phạm về kỷ luật lao động và mức độ phạt tương ứng.

### 📊 Thông tin hiển thị

#### **4 thẻ thống kê vi phạm:**
1. **🔴 Nhân viên vi phạm:** Số lượng NV bị phạt
2. **⏰ Tổng phút đi muộn:** Tổng cộng toàn công ty
3. **🏃 Tổng phút về sớm:** Tổng cộng toàn công ty  
4. **💸 Tổng tiền phạt:** Format VND

#### **4 thẻ phân loại mức độ:**
1. **🟢 Không phạt** (0 VND)
2. **🟡 Phạt nhẹ** (≤ 50,000 VND)
3. **🟠 Phạt trung bình** (≤ 100,000 VND)
4. **🔴 Phạt nặng** (> 100,000 VND)

Mỗi thẻ hiển thị:
- Số lượng nhân viên
- Tỷ lệ % so với tổng

#### **Bảng chi tiết vi phạm (8 cột):**
1. **Nhân viên:** Tên + ID
2. **Phòng ban:** Badge outline
3. **Chức vụ:** Vị trí công việc
4. **Đi muộn:** Số phút, màu đỏ nếu > 0
5. **Về sớm:** Số phút, màu cam nếu > 0
6. **Tiền phạt:** Format VND, màu đỏ/xanh
7. **Mức độ:** Badge màu theo mức độ phạt
8. **Đánh giá:** Emoji + text đánh giá
   - ✅ Xuất sắc (không phạt)
   - ⚠️ Cần chú ý (phạt nhẹ)
   - 📢 Cảnh báo (phạt TB)
   - ❌ Nghiêm trọng (phạt nặng)

### 📈 Sắp xếp
- **Mặc định:** Theo tiền phạt giảm dần
- **Mục đích:** Nhân viên vi phạm nặng hiển thị đầu tiên

### 📤 Export
- Nút **Xuất báo cáo vi phạm**
- File: `penalty-analysis-[thang]-[nam].csv`

### 💡 Cách sử dụng
- Xác định nhân viên cần nhắc nhở
- Phân tích nguyên nhân vi phạm
- Đề xuất biện pháp cải thiện kỷ luật
- Làm cơ sở cho đánh giá hiệu suất

---

## 🎨 Tính năng UX/UI Nổi bật

### 📱 Responsive Design
- **Mobile:** Stack layout, điều chỉnh grid
- **Tablet:** 2 cột layout
- **Desktop:** Full grid layout

### 🎯 Interactive Elements
- **Hover Effects:** Card shadow, button glow
- **Loading States:** Skeleton loading cho tất cả data
- **Smooth Transitions:** Animation mượt mà

### 🌈 Color Coding
- **Xanh lá:** Tích cực, không vi phạm
- **Vàng:** Cảnh báo, phạt nhẹ
- **Cam:** Chú ý, phạt trung bình
- **Đỏ:** Nghiêm trọng, phạt nặng

### ⚡ Performance
- **React Query:** Cache data thông minh
- **Lazy Loading:** Load data khi cần
- **Optimized Charts:** Recharts performance tốt

---

## 🔧 Tính năng Quản lý

### 📅 Bộ lọc thời gian
- **Dropdown tháng:** 1-12
- **Dropdown năm:** 2023-2026
- **Auto-refresh:** Data tự động cập nhật

### 🏢 Filter phòng ban  
- **Dropdown phòng ban:** Tất cả hoặc chọn cụ thể
- **Apply to:** Tab Chấm công và Monthly Attendance API

### 🔄 Refresh Data
- **Nút "Làm mới":** Refresh tất cả data
- **Auto-refresh:** Khi thay đổi filter

### 📤 Export Functions
- **CSV Export:** Từng bảng riêng lẻ
- **Comprehensive Export:** Toàn bộ data JSON
- **File naming:** Convention chuẩn

---

## 🚀 Tips Sử dụng Hiệu quả

### 👀 Quy trình xem báo cáo hàng tháng:
1. **Bắt đầu từ "Tổng quan"** - Hiểu big picture
2. **Chuyển sang "Xu hướng"** - So sánh với tháng trước
3. **Vào "Biểu đồ"** - Phân tích chi tiết từng aspect
4. **Xem "Chấm công"** - Check data cụ thể
5. **Xem "Top nhân viên"** - Ghi nhận thành tích
6. **Kết thúc "Phân tích phạt"** - Xử lý vấn đề

### 📊 Phân tích dữ liệu:
- **Trends:** Tìm patterns theo thời gian
- **Departments:** So sánh hiệu suất phòng ban
- **Individuals:** Đánh giá cá nhân
- **Violations:** Cải thiện kỷ luật

### 💡 Đưa ra quyết định:
- **Hiring:** Dựa trên xu hướng workload
- **Training:** Cho phòng ban kém hiệu quả
- **Rewards:** Cho top performers
- **Discipline:** Cho vi phạm nặng

---

## ❓ Troubleshooting

### 🐛 Lỗi thường gặp:

**1. "Không có dữ liệu"**
- ✅ Kiểm tra đã chọn đúng tháng/năm
- ✅ Đảm bảo có data attendance_summary
- ✅ Refresh lại trang

**2. "Biểu đồ không hiển thị"**
- ✅ Check console log có lỗi API
- ✅ Verify backend đang chạy
- ✅ Kiểm tra kết nối database

**3. "Export không hoạt động"**
- ✅ Cho phép download trong browser
- ✅ Kiểm tra dữ liệu có tồn tại
- ✅ Thử export từ tab khác

### 🔧 Performance Issues:
- **Slow loading:** Giảm range thời gian filter
- **Chart lag:** Refresh browser cache
- **Memory leak:** Restart browser tab

---

## 📞 Hỗ trợ

Nếu gặp vấn đề khi sử dụng hệ thống báo cáo:

1. **Check tài liệu này** trước tiên
2. **Liên hệ IT Support** với screenshot lỗi
3. **Report bug** qua hệ thống ticket nội bộ

---

**📝 Tài liệu này được cập nhật liên tục. Phiên bản mới nhất luôn có sẵn tại `/docs/REPORTS_GUIDE.md`** 