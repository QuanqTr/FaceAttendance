-- Fix Manager Department Relationships
-- This script sets up manager Quang (employee ID 5) to manage multiple departments with 9 total employees

-- 1. Set employee 5 (Quang) as manager of departments 1 and 2
UPDATE departments SET manager_id = 5 WHERE id IN (1, 2);

-- 2. Ensure we have enough employees in departments 1 and 2
-- Move some employees to departments 1 and 2 if needed
UPDATE employees SET department_id = 1 WHERE id IN (1, 3, 5, 7, 9) AND (department_id IS NULL OR department_id NOT IN (1, 2));
UPDATE employees SET department_id = 2 WHERE id IN (2, 4, 6, 8, 10) AND (department_id IS NULL OR department_id NOT IN (1, 2));

-- 3. Create additional employees if needed (up to 9 total)
INSERT INTO employees (employee_id, first_name, last_name, email, department_id, position, status, join_date)
SELECT 
    'EMP' || LPAD((ROW_NUMBER() OVER() + 20)::TEXT, 3, '0'),
    'Employee' || (ROW_NUMBER() OVER() + 20),
    'Test',
    'employee' || (ROW_NUMBER() OVER() + 20) || '@company.com',
    CASE WHEN ROW_NUMBER() OVER() % 2 = 1 THEN 1 ELSE 2 END,
    'Staff',
    'active',
    CURRENT_DATE
FROM generate_series(1, 9) 
WHERE NOT EXISTS (
    SELECT 1 FROM employees WHERE department_id IN (1, 2) 
    HAVING COUNT(*) >= 9
);

-- 4. Verify the setup
SELECT 
    d.id as dept_id,
    d.name as dept_name,
    d.manager_id,
    e.first_name || ' ' || e.last_name as manager_name,
    COUNT(emp.id) as employee_count
FROM departments d
LEFT JOIN employees e ON d.manager_id = e.id
LEFT JOIN employees emp ON emp.department_id = d.id
WHERE d.manager_id = 5
GROUP BY d.id, d.name, d.manager_id, e.first_name, e.last_name
ORDER BY d.id;

-- 5. Show all employees in managed departments
SELECT 
    emp.id,
    emp.employee_id,
    emp.first_name,
    emp.last_name,
    emp.department_id,
    d.name as department_name
FROM employees emp
LEFT JOIN departments d ON emp.department_id = d.id
WHERE emp.department_id IN (1, 2)
ORDER BY emp.department_id, emp.id; 