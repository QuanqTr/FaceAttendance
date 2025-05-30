# Tài liệu mô tả cấu trúc Database - Hệ thống chấm công nhận diện khuôn mặt

## 1. Bảng EMPLOYEES (Nhân viên)
**Ý nghĩa:** Bảng lưu trữ thông tin chi tiết của tất cả nhân viên trong công ty

| Tên thuộc tính | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|----------------|--------------|-----------|---------|
| id | serial | Khóa chính | Mã định danh nhân viên (tự động tăng) |
| employee_id | character varying(20) | | Mã nhân viên (do công ty quy định) |
| first_name | text | | Họ của nhân viên |
| last_name | text | | Tên của nhân viên |
| email | text | | Địa chỉ email nhân viên |
| phone | text | | Số điện thoại liên lạc |
| department_id | integer | Khóa ngoại | Mã phòng ban (tham chiếu departments.id) |
| position | text | | Chức vụ/vị trí công việc |
| status | employee_status | | Trạng thái nhân viên (active/inactive/on_leave) |
| face_descriptor | text | | Dữ liệu mô tả khuôn mặt cho nhận diện |
| join_date | date | | Ngày gia nhập công ty |
| created_at | timestamp with timezone | | Thời gian tạo bản ghi |
| updated_at | timestamp with timezone | | Thời gian cập nhật cuối cùng |

---

## 2. Bảng DEPARTMENTS (Phòng ban)
**Ý nghĩa:** Bảng quản lý thông tin các phòng ban trong công ty

| Tên thuộc tính | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|----------------|--------------|-----------|---------|
| id | serial | Khóa chính | Mã định danh phòng ban |
| name | text | | Tên phòng ban |
| description | text | | Mô tả về phòng ban |
| manager_id | integer | Khóa ngoại | Mã quản lý phòng ban (tham chiếu users.id) |
| created_at | timestamp with timezone | | Thời gian tạo phòng ban |

---

## 3. Bảng USERS (Người dùng hệ thống)
**Ý nghĩa:** Bảng quản lý tài khoản đăng nhập của admin/quản lý

| Tên thuộc tính | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|----------------|--------------|-----------|---------|
| id | serial | Khóa chính | Mã định danh người dùng |
| username | text | | Tên đăng nhập |
| password | text | | Mật khẩu đã mã hóa |
| role | text | | Vai trò trong hệ thống (admin/manager) |
| created_at | timestamp with timezone | | Thời gian tạo tài khoản |
| employee_id | integer | Khóa ngoại | Mã nhân viên tương ứng (tham chiếu employees.id) |
| full_name | text | | Họ tên đầy đủ |

---

## 4. Bảng TIME_LOGS (Nhật ký chấm công)
**Ý nghĩa:** Bảng ghi lại các lần chấm công vào/ra của nhân viên

| Tên thuộc tính | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|----------------|--------------|-----------|---------|
| id | serial | Khóa chính | Mã định danh bản ghi chấm công |
| employee_id | integer | Khóa ngoại | Mã nhân viên (tham chiếu employees.id) |
| log_time | timestamp without timezone | | Thời gian chấm công |
| type | text | | Loại chấm công (checkin/checkout) |
| source | text | | Nguồn chấm công (face/manual) |

---

## 5. Bảng WORK_HOURS (Giờ làm việc)
**Ý nghĩa:** Bảng tính toán và lưu trữ giờ làm việc hàng ngày của nhân viên

| Tên thuộc tính | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|----------------|--------------|-----------|---------|
| id | serial | Khóa chính | Mã định danh bản ghi giờ làm |
| employee_id | integer | Khóa ngoại | Mã nhân viên (tham chiếu employees.id) |
| work_date | date | | Ngày làm việc |
| first_checkin | timestamp without timezone | | Thời gian check-in đầu tiên |
| last_checkout | timestamp without timezone | | Thời gian check-out cuối cùng |
| regular_hours | numeric(5,2) | | Số giờ làm việc bình thường |
| ot_hours | numeric(5,2) | | Số giờ làm thêm |
| status | text | | Trạng thái (normal/late/early_leave/absent) |

---

## 6. Bảng ATTENDANCE_SUMMARY (Tổng kết chấm công)
**Ý nghĩa:** Bảng tổng hợp thống kê chấm công theo tháng của từng nhân viên

| Tên thuộc tính | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|----------------|--------------|-----------|---------|
| id | serial | Khóa chính | Mã định danh bản ghi tổng kết |
| employee_id | integer | Khóa ngoại | Mã nhân viên (tham chiếu employees.id) |
| month | integer | | Tháng tổng kết |
| year | integer | | Năm tổng kết |
| total_hours | numeric(5,2) | | Tổng số giờ làm việc |
| overtime_hours | numeric(5,2) | | Tổng số giờ làm thêm |
| leave_days | integer | | Số ngày nghỉ phép |
| created_at | timestamp with timezone | | Thời gian tạo bản ghi |
| early_minutes | integer | | Tổng số phút về sớm |
| late_minutes | integer | | Tổng số phút đi muộn |
| penalty_amount | numeric(10,2) | | Số tiền phạt (nếu có) |

---

## 7. Bảng LEAVE_REQUESTS (Yêu cầu nghỉ phép)
**Ý nghĩa:** Bảng quản lý các đơn xin nghỉ phép của nhân viên

| Tên thuộc tính | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|----------------|--------------|-----------|---------|
| id | serial | Khóa chính | Mã định danh đơn nghỉ phép |
| employee_id | integer | Khóa ngoại | Mã nhân viên (tham chiếu employees.id) |
| start_date | date | | Ngày bắt đầu nghỉ |
| end_date | date | | Ngày kết thúc nghỉ |
| type | leave_request_type | | Loại nghỉ phép (sick/vacation/personal/other) |
| reason | text | | Lý do nghỉ phép |
| status | leave_request_status | | Trạng thái đơn (pending/approved/rejected/cancelled) |
| approved_by_id | integer | Khóa ngoại | Người phê duyệt (tham chiếu users.id) |
| approved_at | timestamp with timezone | | Thời gian phê duyệt |
| created_at | timestamp with timezone | | Thời gian tạo đơn |
| updated_at | timestamp with timezone | | Thời gian cập nhật cuối |

---

## 8. Bảng FACE_RECOGNITION_LOGS (Nhật ký nhận diện khuôn mặt)
**Ý nghĩa:** Bảng ghi lại tất cả các lần thử nhận diện khuôn mặt

| Tên thuộc tính | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|----------------|--------------|-----------|---------|
| id | serial | Khóa chính | Mã định danh bản ghi nhận diện |
| employee_id | integer | Khóa ngoại | Mã nhân viên (tham chiếu employees.id) |
| timestamp | timestamp with timezone | | Thời gian thực hiện nhận diện |
| success | boolean | | Kết quả nhận diện (thành công/thất bại) |
| confidence_score | numeric(5,2) | | Điểm tin cậy của việc nhận diện |
| image_path | text | | Đường dẫn lưu ảnh chấm công |
| error_message | text | | Thông báo lỗi (nếu có) |

---

## 9. Bảng FACE_DATA (Dữ liệu khuôn mặt)
**Ý nghĩa:** Bảng lưu trữ dữ liệu khuôn mặt đã xử lý của nhân viên

| Tên thuộc tính | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|----------------|--------------|-----------|---------|
| id | serial | Khóa chính | Mã định danh dữ liệu khuôn mặt |
| employee_id | integer | Khóa ngoại | Mã nhân viên (tham chiếu employees.id) |
| descriptor | text | | Dữ liệu vector mô tả khuôn mặt |
| quality | numeric(5,2) | | Chất lượng ảnh khuôn mặt |
| created_at | timestamp with timezone | | Thời gian tạo dữ liệu |
| updated_at | timestamp with timezone | | Thời gian cập nhật |
| is_active | boolean | | Trạng thái hoạt động của dữ liệu |

---

## 10. Bảng CACHED_WORK_HOURS (Cache giờ làm việc)
**Ý nghĩa:** Bảng cache để tăng tốc độ truy vấn thông tin giờ làm việc

| Tên thuộc tính | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|----------------|--------------|-----------|---------|
| id | serial | Khóa chính | Mã định danh cache |
| employee_id | integer | Khóa ngoại | Mã nhân viên (tham chiếu employees.id) |
| date | date | | Ngày làm việc |
| regular_hours | numeric(5,2) | | Số giờ làm việc bình thường |
| overtime_hours | numeric(5,2) | | Số giờ làm thêm |
| regular_hours_formatted | text | | Giờ làm bình thường (định dạng hiển thị) |
| overtime_hours_formatted | text | | Giờ làm thêm (định dạng hiển thị) |
| total_hours_formatted | text | | Tổng giờ làm (định dạng hiển thị) |
| checkin_time | timestamp | | Thời gian check-in |
| checkout_time | timestamp | | Thời gian check-out |
| created_at | timestamp with timezone | | Thời gian tạo cache |
| updated_at | timestamp with timezone | | Thời gian cập nhật cache |

---

## 11. Bảng NOTIFICATIONS (Thông báo)
**Ý nghĩa:** Bảng quản lý thông báo gửi đến nhân viên

| Tên thuộc tính | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|----------------|--------------|-----------|---------|
| id | serial | Khóa chính | Mã định danh thông báo |
| employee_id | integer | Khóa ngoại | Mã nhân viên nhận (tham chiếu employees.id) |
| title | text | | Tiêu đề thông báo |
| message | text | | Nội dung thông báo |
| type | text | | Loại thông báo (info/warning/error/success) |
| read | boolean | | Trạng thái đã đọc |
| created_at | timestamp with timezone | | Thời gian tạo thông báo |
| updated_at | timestamp with timezone | | Thời gian cập nhật |

---

## 12. Bảng HOLIDAYS (Ngày lễ)
**Ý nghĩa:** Bảng lưu trữ thông tin các ngày lễ, nghỉ chính thức

| Tên thuộc tính | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|----------------|--------------|-----------|---------|
| id | serial | Khóa chính | Mã định danh ngày lễ |
| name | character varying(100) | | Tên ngày lễ |
| date | date | | Ngày tháng của ngày lễ |
| description | text | | Mô tả chi tiết về ngày lễ |
| created_at | timestamp with timezone | | Thời gian tạo bản ghi |

---

## 13. Bảng SESSION (Phiên đăng nhập)
**Ý nghĩa:** Bảng quản lý phiên đăng nhập của người dùng

| Tên thuộc tính | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|----------------|--------------|-----------|---------|
| sid | character varying | Khóa chính | Mã định danh phiên đăng nhập |
| sess | json | | Dữ liệu phiên làm việc (JSON) |
| expire | timestamp without time zone | | Thời gian hết hạn phiên |

---

## Mối quan hệ chính trong Database:

### 🔗 **Quan hệ 1-nhiều:**
- `departments` → `employees` (1 phòng ban có nhiều nhân viên)
- `employees` → `time_logs` (1 nhân viên có nhiều lần chấm công)
- `employees` → `leave_requests` (1 nhân viên có nhiều đơn nghỉ phép)
- `employees` → `work_hours` (1 nhân viên có nhiều ngày làm việc)
- `employees` → `attendance_summary` (1 nhân viên có nhiều tháng tổng kết)
- `employees` → `notifications` (1 nhân viên có nhiều thông báo)
- `employees` → `face_data` (1 nhân viên có nhiều dữ liệu khuôn mặt)

### 🔗 **Quan hệ 1-1:**
- `users` ↔ `employees` (1 tài khoản tương ứng 1 nhân viên)

### 🔗 **Quan hệ tham chiếu:**
- `departments.manager_id` → `users.id` (Quản lý phòng ban)
- `leave_requests.approved_by_id` → `users.id` (Người phê duyệt đơn nghỉ) 