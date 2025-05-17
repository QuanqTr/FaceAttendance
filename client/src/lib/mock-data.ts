// Dữ liệu mẫu để sử dụng khi API không hoạt động

export const mockDepartments = [
    {
        id: 1,
        name: "DS",
        description: "Phòng Design",
        managerId: null,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: 2,
        name: "HR",
        description: "Phòng Nhân sự",
        managerId: null,
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

export const mockEmployees = [
    {
        id: 1,
        employeeId: "EMP001",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "1234567890",
        position: "Manager",
        status: "active",
        departmentId: 1,
        joinDate: new Date("2020-01-01"),
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: 2,
        employeeId: "EMP002",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        phone: "0987654321",
        position: "Developer",
        status: "active",
        departmentId: 2,
        joinDate: new Date("2020-02-01"),
        createdAt: new Date(),
        updatedAt: new Date()
    }
]; 