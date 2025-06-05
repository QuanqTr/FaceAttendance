# Test Manager Employee Attendance Fix

## Các Lỗi Đã Sửa

### 🔧 Lỗi Manager Employee Attendance Tab:

1. **Lỗi schema database** - API sử dụng sai tên cột
2. **Thiếu kiểm tra quyền** - Không kiểm tra manager có quyền truy cập nhân viên không
3. **Lỗi kiểu dữ liệu** - Frontend cố gắng gọi .toFixed() trên string thay vì number
4. **Thiếu import function** - getManagerDepartmentIds không được import

### 🕐 Lỗi User Attendance History Time:

5. **Lỗi thời gian sai** - Thời gian không hiển thị đúng múi giờ Việt Nam
6. **Lỗi ngày cuối tuần** - Thứ 4, Thứ 5 bị bôi xám thay vì Thứ 7, CN

## Các Thay Đổi Đã Thực Hiện

### 1. Sửa API Query (`server/routes/managerRoutes.ts`)

- Cập nhật tên cột để khớp với schema database thực tế:
  - `work_date` thay vì `date`
  - `first_checkin` thay vì `check_in`
  - `last_checkout` thay vì `check_out`
  - `ot_hours` thay vì `overtime_hours`
- Thêm các trường tính toán cho `totalHours`, `lateMinutes`, `earlyMinutes`
- Thêm kiểm tra quyền để xác minh manager có thể truy cập nhân viên
- Thêm import `getManagerDepartmentIds` function
- Sử dụng `::numeric` để đảm bảo dữ liệu trả về là số

### 2. Sửa Frontend Component (`client/src/components/manager/employee-attendance-history.tsx`)

- Chuyển đổi string thành number trước khi gọi `.toFixed()`
- Sử dụng `Number()` để đảm bảo kiểu dữ liệu đúng
- Xử lý trường hợp null/undefined an toàn

### 3. Sửa User Attendance Time Issues

- **Sửa ngày cuối tuần** (`client/src/components/attendance/monthly-attendance-calendar.tsx`):

  - Thay đổi logic `isCustomWeekend` để đúng Thứ 7 (6) và CN (0)
  - Loại bỏ logic shift sai làm Thứ 4, Thứ 5 bị bôi xám

- **Sửa thời gian hiển thị** (`client/src/components/attendance/attendance-table.tsx`):

  - Thêm function `formatTimeVN` để format thời gian đúng múi giờ Việt Nam
  - Sử dụng `format(date, "HH:mm:ss")` thay vì format trực tiếp từ UTC

- **Sửa backend time handling** (`server/controllers/workHoursController.ts`):
  - Đơn giản hóa logic format thời gian
  - Sử dụng `toISOString()` để đảm bảo tính nhất quán

### 4. Thêm Test Endpoint

- `/api/test/manager/employees/:employeeId/work-hours` để debug

## Testing Steps

### 1. Test the API directly

```bash
# Test with a specific employee ID (replace 4 with actual employee ID)
curl "http://localhost:5000/api/test/manager/employees/4/work-hours?startDate=2025-01-01&endDate=2025-12-31"
```

### 2. Create sample data if needed

```bash
# Create sample work hours data
curl -X POST "http://localhost:5000/api/test/create-work-hours-sample" \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-01-15", "departments": [10, 12, 8]}'
```

### 3. Check database structure

```bash
curl "http://localhost:5000/api/test/manager/debug"
```

### 4. Test the actual manager endpoint (requires authentication)

Navigate to: `http://localhost:5000/manager/employees/[employee-id]` and check the attendance tab

## Expected Results

1. **API should return work hours data** in this format:

```json
{
  "success": true,
  "employee": {
    "id": 4,
    "first_name": "Employee",
    "last_name": "Name",
    "department_id": 10
  },
  "workHours": [
    {
      "id": 1,
      "date": "2025-01-15",
      "checkIn": "2025-01-15T08:15:00.000Z",
      "checkOut": "2025-01-15T17:30:00.000Z",
      "regularHours": "8.25",
      "overtimeHours": "1.25",
      "totalHours": 9.5,
      "status": "normal"
    }
  ],
  "count": 1
}
```

2. **Frontend should display**:
   - Summary cards with attendance statistics
   - Table with daily attendance records
   - Proper Vietnamese labels and formatting

## Troubleshooting

If still not working:

1. **Check if employee exists and has work hours data**:

   ```bash
   curl "http://localhost:5000/api/test/manager/employees/4/work-hours"
   ```

2. **Create sample data for current month**:

   ```bash
   curl -X POST "http://localhost:5000/api/test/create-work-hours-sample" \
     -H "Content-Type: application/json" \
     -d '{"date": "2025-01-15"}'
   ```

3. **Check browser console** for any JavaScript errors

4. **Check server logs** for detailed error messages with the added console.log statements
