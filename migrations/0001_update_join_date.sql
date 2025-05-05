-- Đổi kiểu dữ liệu của join_date từ timestamp sang date
ALTER TABLE "employees" 
ALTER COLUMN "join_date" TYPE date 
USING "join_date"::date; 