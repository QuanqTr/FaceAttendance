-- Create sample work hours data for testing dashboard
-- This script creates realistic work hours data for the last 30 days

-- First, let's check if we have employees
DO $$
DECLARE
    employee_count INTEGER;
    emp_record RECORD;
    current_date_iter DATE;
    work_date DATE;
    checkin_hour INTEGER;
    checkout_hour INTEGER;
    regular_hours DECIMAL;
    overtime_hours DECIMAL;
    status_val TEXT;
BEGIN
    -- Count employees
    SELECT COUNT(*) INTO employee_count FROM employees;
    
    IF employee_count = 0 THEN
        RAISE NOTICE 'No employees found. Please create employees first.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Creating work hours data for % employees', employee_count;
    
    -- Clear existing work hours data
    DELETE FROM work_hours;
    
    -- Generate data for last 30 days
    FOR i IN 0..29 LOOP
        work_date := CURRENT_DATE - INTERVAL '1 day' * i;
        
        -- Skip weekends
        IF EXTRACT(DOW FROM work_date) NOT IN (0, 6) THEN
            -- For each employee
            FOR emp_record IN SELECT id FROM employees LOOP
                -- 85% chance employee is present
                IF random() < 0.85 THEN
                    -- Random check-in time between 8:00-10:00 AM
                    checkin_hour := 8 + floor(random() * 2);
                    
                    -- Random work duration 8-10 hours
                    checkout_hour := checkin_hour + 8 + floor(random() * 2);
                    
                    -- Calculate hours
                    regular_hours := LEAST(8, checkout_hour - checkin_hour);
                    overtime_hours := GREATEST(0, checkout_hour - checkin_hour - 8);
                    
                    -- Determine status
                    IF checkin_hour > 9 THEN
                        status_val := 'late';
                    ELSE
                        status_val := 'present';
                    END IF;
                    
                    -- Insert work hours record
                    INSERT INTO work_hours (
                        employee_id,
                        work_date,
                        first_checkin,
                        last_checkout,
                        regular_hours,
                        ot_hours,
                        status
                    ) VALUES (
                        emp_record.id,
                        work_date,
                        work_date + (checkin_hour || ' hours')::INTERVAL + (floor(random() * 60) || ' minutes')::INTERVAL,
                        work_date + (checkout_hour || ' hours')::INTERVAL + (floor(random() * 60) || ' minutes')::INTERVAL,
                        regular_hours::TEXT,
                        overtime_hours::TEXT,
                        status_val
                    );
                END IF;
            END LOOP;
        END IF;
    END LOOP;
    
    -- Show summary
    RAISE NOTICE 'Work hours data created successfully!';
    RAISE NOTICE 'Total records: %', (SELECT COUNT(*) FROM work_hours);
    RAISE NOTICE 'Unique employees: %', (SELECT COUNT(DISTINCT employee_id) FROM work_hours);
    RAISE NOTICE 'Date range: % to %',
        (SELECT MIN(work_date) FROM work_hours),
        (SELECT MAX(work_date) FROM work_hours);
END $$;
