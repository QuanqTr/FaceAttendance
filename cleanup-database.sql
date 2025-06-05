-- 🧹 Cleanup Database Script
-- Xóa dữ liệu test cũ để test validation logic

-- 1. Xóa time logs của employee 5 (Quang Trần Đại)
DELETE FROM time_logs WHERE employee_id = 5;

-- 2. Xóa face recognition logs của employee 5
DELETE FROM face_recognition_logs WHERE employee_id = 5;

-- 3. Xóa work hours của employee 5
DELETE FROM work_hours WHERE employee_id = 5;

-- 4. Xóa cached work hours của employee 5
DELETE FROM cached_work_hours WHERE employee_id = 5;

-- 5. Verify cleanup
SELECT 'time_logs' as table_name, COUNT(*) as remaining_records FROM time_logs WHERE employee_id = 5
UNION ALL
SELECT 'face_recognition_logs', COUNT(*) FROM face_recognition_logs WHERE employee_id = 5
UNION ALL
SELECT 'work_hours', COUNT(*) FROM work_hours WHERE employee_id = 5
UNION ALL
SELECT 'cached_work_hours', COUNT(*) FROM cached_work_hours WHERE employee_id = 5;

-- Expected result: All counts should be 0
