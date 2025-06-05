-- 🔍 Check Employee Department Information
-- Kiểm tra thông tin department của employee ID 5 (Quang Trần Đại)

-- 1. Kiểm tra employee info
SELECT 
    id,
    employee_id,
    first_name,
    last_name,
    department_id,
    position,
    status
FROM employees 
WHERE id = 5;

-- 2. Kiểm tra department info nếu có department_id
SELECT 
    d.id,
    d.name,
    d.description,
    d.manager_id
FROM departments d
WHERE d.id = (SELECT department_id FROM employees WHERE id = 5);

-- 3. Join query để xem full info
SELECT 
    e.id as employee_id,
    e.employee_id as employee_code,
    e.first_name,
    e.last_name,
    e.department_id,
    d.name as department_name,
    d.description as department_description
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
WHERE e.id = 5;

-- 4. Kiểm tra tất cả departments có sẵn
SELECT id, name, description FROM departments ORDER BY id;
