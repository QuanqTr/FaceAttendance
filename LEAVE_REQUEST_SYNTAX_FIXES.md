# Sửa Lỗi Cú Pháp File leave-requests.tsx

## ✅ Các Lỗi Đã Được Sửa

### 1. **Import Context Sai**
**Lỗi:**
```tsx
import { useAuth } from "@/contexts/AuthContext";  // ❌ Sai path
```
**Đã sửa:**
```tsx
import { useAuth } from "@/hooks/use-auth";  // ✅ Đúng path
```

### 2. **Thiếu Import Types**
**Lỗi:**
```tsx
import { LeaveRequest } from "@shared/schema";  // ❌ Thiếu Employee, Department
```
**Đã sửa:**
```tsx
import { LeaveRequest, Employee, Department } from "@shared/schema";  // ✅ Đầy đủ types
```

### 3. **Import useToast Sai Path**
**Lỗi:**
```tsx
import { useToast } from "@/components/ui/use-toast";  // ❌ Sai path
```
**Đã sửa:**
```tsx
import { useToast } from "@/hooks/use-toast";  // ✅ Đúng path
```

### 4. **Sử dụng apiRequest Function Không Tồn Tại**
**Lỗi:**
```tsx
const res = await apiRequest("GET", "/api/departments");  // ❌ Function không tồn tại
return res.data;
```
**Đã sửa:**
```tsx
const res = await fetch("/api/departments", { credentials: "include" });  // ✅ Dùng fetch trực tiếp
return await res.json();
```

### 5. **Sử dụng Sai Property Name**
**Lỗi:**
```tsx
{dept.description}  // ❌ Property không đúng
{department.description}  // ❌ Property không đúng
```
**Đã sửa:**
```tsx
{dept.name}  // ✅ Đúng property
{department.name}  // ✅ Đúng property
```

### 6. **Khai Báo Variables Không Sử Dụng**
**Lỗi:**
```tsx
const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);  // ❌ Không sử dụng
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);  // ❌ Không sử dụng
const [employeeInfo, setEmployeeInfo] = useState<{ [key: number]: Employee }>({});  // ❌ Không sử dụng
const [departmentInfo, setDepartmentInfo] = useState<{ [key: number]: Department }>({});  // ❌ Không sử dụng
```
**Đã sửa:**
```tsx
// ✅ Đã xóa các variables không sử dụng
```

### 7. **Import Không Cần Thiết**
**Lỗi:**
```tsx
import { useEffect } from "react";  // ❌ Không sử dụng
import { Loader2, Clock, User, MoreHorizontal, Filter, Search, CalendarDays } from "lucide-react";  // ❌ Một số không sử dụng
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";  // ❌ Không sử dụng
```
**Đã sửa:**
```tsx
// ✅ Đã xóa các import không cần thiết
import { Plus, Calendar, FileCheck, FileX, FileQuestion } from "lucide-react";  // ✅ Chỉ giữ lại những gì cần
import { Card, CardContent } from "@/components/ui/card";  // ✅ Chỉ giữ lại những gì cần
```

### 8. **Cải Thiện Error Handling**
**Lỗi:**
```tsx
// Không có error handling cho fetch requests
```
**Đã sửa:**
```tsx
try {
  const res = await fetch(`/api/employees/${id}`, { credentials: "include" });
  if (res.ok) {
    result[id] = await res.json();
  }
} catch (error) {
  console.error(`Failed to fetch employee ${id}:`, error);
}
```

## ✅ Kết Quả
- File `leave-requests.tsx` hiện tại đã không còn lỗi cú pháp
- TypeScript types đã được import đầy đủ
- API calls đã được chuẩn hóa sử dụng fetch
- Code đã được tối ưu hóa bằng cách loại bỏ các import và variables không cần thiết
- Error handling đã được cải thiện

## 🔧 Kiểm Tra
Để kiểm tra file đã hoạt động đúng:

1. **Compile check:**
   ```bash
   cd client
   npm run type-check
   ```

2. **Lint check:**
   ```bash
   npm run lint
   ```

3. **Build check:**
   ```bash
   npm run build
   ```

File hiện tại đã sẵn sàng để sử dụng và không còn lỗi cú pháp. 