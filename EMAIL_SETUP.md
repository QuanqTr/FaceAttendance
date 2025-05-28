# Hướng dẫn cấu hình Email cho tính năng Quên mật khẩu

## 1. Tạo Gmail App Password

1. Đăng nhập vào Gmail của bạn (mynameisquanq@gmail.com)
2. Vào **Google Account Settings** → **Security**
3. Bật **2-Step Verification** (nếu chưa bật)
4. Tìm **App passwords** và tạo password cho ứng dụng
5. Chọn **Mail** và **Custom** (nhập tên: FaceAttend)
6. Copy mật khẩu app được tạo

## 2. Cấu hình biến môi trường

Thêm vào file `.env` trong thư mục root:

```env
# Gmail Configuration
GMAIL_USER=mynameisquanq@gmail.com
GMAIL_APP_PASSWORD=aixkpfwaxfinuswp
```

**Lưu ý:** 
- `GMAIL_USER`: mynameisquanq@gmail.com
- `GMAIL_APP_PASSWORD`: aixk pfwa xfin uswp (đã được cung cấp)

## 3. Kiểm tra tính năng

1. Khởi động server: `npm run dev`
2. Vào trang login
3. Nhấn "Quên mật khẩu?"
4. Nhập email nhân viên trong hệ thống
5. Kiểm tra email để nhận mật khẩu mới

## 4. Tính năng hiện có

✅ **Đã cấu hình thành công:**
- Email gửi: mynameisquanq@gmail.com
- App Password: aixk pfwa xfin uswp
- Gửi email HTML đẹp với mật khẩu mới
- Tự động cập nhật mật khẩu trong database
- Xác thực email tồn tại trong hệ thống

## 5. Xử lý sự cố

### Lỗi "Invalid login":
- ✅ App Password đã được cấu hình
- ✅ Email đã được xác thực

### Lỗi "Gmail not configured":
- Kiểm tra file .env có đúng định dạng
- Restart server sau khi thay đổi .env

### Email không nhận được:
- Kiểm tra thư mục Spam
- Đảm bảo email nhân viên tồn tại trong database
- Kiểm tra logs server để xem lỗi gửi email

## 6. Security Notes

- **KHÔNG** commit file .env vào git
- Sử dụng App Password thay vì mật khẩu Gmail chính
- Rotate App Password định kỳ
- Chỉ cấp quyền tối thiểu cần thiết 

## 7. Test Flow

1. Nhân viên quên mật khẩu → Nhấn "Quên mật khẩu?"
2. Nhập email đã đăng ký trong hệ thống
3. Hệ thống gửi email về mynameisquanq@gmail.com để chuyển tiếp
4. Mật khẩu mới được tạo tự động và lưu vào database
5. Nhân viên nhận email với mật khẩu mới
6. Đăng nhập với mật khẩu mới 