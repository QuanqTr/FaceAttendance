import { Express } from "express";
import { ensureAuthenticated, ensureManager } from "../middlewares/auth";
import {
    getAllManagers,
    getManagerDailyStats,
    getManagerWeeklyStats,
    getManagerDepartmentStats,
    getManagerLeaveRequests,
    getManagerLeaveRequest,
    createManagerLeaveRequest,
    updateManagerLeaveRequest,
    deleteManagerLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    getManagerEmployees,
    getManagerEmployee,
    createManagerEmployee,
    updateManagerEmployee,
    deleteManagerEmployee,
    getManagerAttendanceSummary,
    getManagerAttendance,
    getManagerDepartmentInfo,
    getManagerDepartments,
    getManagerUsers,
    createManagerUser,
    getManagerReports,
    getManagerWorkHours,
    getPendingApprovalsCount,
    getTopPerformers,
    createSampleTimeLogs
} from "../controllers/managerController";

export function managerRoutes(app: Express) {
    // Manager authentication required for all routes

    // Department and Manager Info
    app.get("/api/manager/department-info", ensureAuthenticated, ensureManager, getManagerDepartmentInfo);
    app.get("/api/manager/departments", ensureAuthenticated, ensureManager, getManagerDepartments);
    app.get("/api/managers", ensureAuthenticated, getAllManagers);

    // Pending items
    app.get("/api/manager/pending-counts", ensureAuthenticated, ensureManager, getPendingApprovalsCount);

    // Employee Management (Department-scoped)
    app.get("/api/manager/employees", ensureAuthenticated, ensureManager, getManagerEmployees);
    app.get("/api/manager/employees/:id", ensureAuthenticated, ensureManager, getManagerEmployee);
    app.post("/api/manager/employees", ensureAuthenticated, ensureManager, createManagerEmployee);
    app.put("/api/manager/employees/:id", ensureAuthenticated, ensureManager, updateManagerEmployee);
    app.delete("/api/manager/employees/:id", ensureAuthenticated, ensureManager, deleteManagerEmployee);

    // Leave Requests Management
    app.get("/api/manager/leave-requests", ensureAuthenticated, ensureManager, getManagerLeaveRequests);
    app.get("/api/manager/leave-requests/:id", ensureAuthenticated, ensureManager, getManagerLeaveRequest);
    app.post("/api/manager/leave-requests", ensureAuthenticated, ensureManager, createManagerLeaveRequest);
    app.put("/api/manager/leave-requests/:id", ensureAuthenticated, ensureManager, updateManagerLeaveRequest);
    app.delete("/api/manager/leave-requests/:id", ensureAuthenticated, ensureManager, deleteManagerLeaveRequest);
    app.put("/api/manager/leave-requests/:id/approve", ensureAuthenticated, ensureManager, approveLeaveRequest);
    app.put("/api/manager/leave-requests/:id/reject", ensureAuthenticated, ensureManager, rejectLeaveRequest);

    // User Account Management (Department employees)
    app.get("/api/manager/users", ensureAuthenticated, ensureManager, getManagerUsers);
    app.post("/api/manager/users", ensureAuthenticated, ensureManager, createManagerUser);

    // Statistics and Reports (Department-scoped)
    app.get("/api/manager/stats/daily", ensureAuthenticated, ensureManager, getManagerDailyStats);
    app.get("/api/manager/stats/weekly", ensureAuthenticated, ensureManager, getManagerWeeklyStats);
    app.get("/api/manager/stats/department", ensureAuthenticated, ensureManager, getManagerDepartmentStats);
    app.get("/api/manager/stats/departments", ensureAuthenticated, ensureManager, getManagerDepartmentStats);
    app.get("/api/manager/stats/top-performers", ensureAuthenticated, ensureManager, getTopPerformers);

    // Reports endpoints for manager interface - Using database data like admin
    app.get("/api/manager/stats/department-overall", ensureAuthenticated, ensureManager, (req, res) => {
        req.query.type = 'department-summary';
        getManagerReports(req, res);
    });

    app.get("/api/manager/stats/attendance-records", ensureAuthenticated, ensureManager, (req, res) => {
        req.query.type = 'attendance-records';
        getManagerReports(req, res);
    });

    app.get("/api/manager/stats/team-performance", ensureAuthenticated, ensureManager, (req, res) => {
        req.query.type = 'team-performance';
        getManagerReports(req, res);
    });

    app.get("/api/manager/stats/penalty-analysis", ensureAuthenticated, ensureManager, (req, res) => {
        req.query.type = 'penalty-analysis';
        getManagerReports(req, res);
    });

    app.get("/api/manager/stats/attendance-trends", ensureAuthenticated, ensureManager, (req, res) => {
        req.query.type = 'attendance-trends';
        getManagerReports(req, res);
    });

    app.get("/api/manager/stats/employees", ensureAuthenticated, ensureManager, (req, res) => {
        req.query.type = 'attendance-records';
        getManagerReports(req, res);
    });

    // Reports Generation - Using database data like admin interface
    app.get("/api/manager/reports", ensureAuthenticated, ensureManager, getManagerReports);

    // Attendance Management
    app.get("/api/manager/attendance-summary", ensureAuthenticated, ensureManager, getManagerAttendanceSummary);
    app.get("/api/manager/attendance", ensureAuthenticated, ensureManager, getManagerAttendance);
    app.get("/api/manager/work-hours", ensureAuthenticated, ensureManager, getManagerWorkHours);

    // Development/Testing endpoints (without authentication)
    if (process.env.NODE_ENV === "development") {
        console.log("🚧 Development mode: Manager test endpoints enabled");

        // Test endpoints with mock manager user (user quang, ID 3, employee_id 5)
        app.get("/api/test/manager/employees", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerEmployees(req, res);
        });

        app.get("/api/test/manager/leave-requests", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerLeaveRequests(req, res);
        });

        app.get("/api/test/manager/stats/daily", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerDailyStats(req, res);
        });

        app.get("/api/test/manager/stats/department", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerDepartmentStats(req, res);
        });

        app.get("/api/test/manager/department-info", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerDepartmentInfo(req, res);
        });

        app.get("/api/test/manager/attendance-summary", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerAttendanceSummary(req, res);
        });

        app.get("/api/test/manager/pending-counts", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getPendingApprovalsCount(req, res);
        });

        app.get("/api/test/manager/stats/top-performers", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getTopPerformers(req, res);
        });

        app.get("/api/test/manager/attendance", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerAttendance(req, res);
        });

        app.get("/api/test/manager/reports", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerReports(req, res);
        });

        app.get("/api/test/manager/employees/:id", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerEmployee(req, res);
        });

        // Create sample time logs for testing
        app.post("/api/test/manager/create-sample-logs", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            createSampleTimeLogs(req, res);
        });

        // Debug endpoint to check database queries
        app.get("/api/test/manager/debug", async (req, res) => {
            try {
                const { pool } = await import('../db.js');

                // Test basic query
                const basicTest = await pool.query('SELECT COUNT(*) as count FROM employees');
                console.log('Basic test:', basicTest.rows[0]);

                // Test departments query
                const deptTest = await pool.query('SELECT id, name, manager_id FROM departments LIMIT 5');
                console.log('Department test:', deptTest.rows);

                // Test time_logs table structure
                const timeLogsTest = await pool.query(`
                    SELECT column_name, data_type, is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name = 'time_logs'
                    ORDER BY ordinal_position
                `);
                console.log('Time logs structure:', timeLogsTest.rows);

                res.json({
                    success: true,
                    basicTest: basicTest.rows[0],
                    departments: deptTest.rows,
                    timeLogsStructure: timeLogsTest.rows
                });
            } catch (error) {
                console.error('Debug error:', error);
                res.status(500).json({
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
            }
        });

        // Database fix endpoint for development
        app.post("/api/test/fix-manager-departments", async (req, res) => {
            try {
                console.log('🔧 Fixing manager departments via API...');
                const { pool } = await import('../db.js');

                // First check what departments exist
                const deptCheck = await pool.query('SELECT id, name, manager_id FROM departments ORDER BY id');
                console.log('📋 Existing departments:', deptCheck.rows);

                // Check what employees exist  
                const empCheck = await pool.query('SELECT id, first_name, last_name, department_id FROM employees ORDER BY id');
                console.log('👥 Existing employees:', empCheck.rows);

                // Check if employee 5 exists
                const emp5Check = await pool.query('SELECT * FROM employees WHERE id = 5');
                if (emp5Check.rows.length === 0) {
                    console.log('❌ Employee 5 does not exist, cannot proceed');
                    return res.json({
                        error: 'Employee 5 (Quang) does not exist in database',
                        departments: deptCheck.rows,
                        employees: empCheck.rows
                    });
                }

                // Only set manager if departments exist
                if (deptCheck.rows.length >= 2) {
                    // Set employee 5 as manager of first two departments
                    const firstDeptId = deptCheck.rows[0].id;
                    const secondDeptId = deptCheck.rows[1].id;

                    await pool.query('UPDATE departments SET manager_id = 5 WHERE id IN ($1, $2)', [firstDeptId, secondDeptId]);
                    console.log(`✅ Set employee 5 as manager of departments ${firstDeptId} and ${secondDeptId}`);
                } else {
                    console.log('❌ Not enough departments to assign manager');
                }

                // Verify the setup
                const result = await pool.query(`
                    SELECT 
                        d.id,
                        d.name,
                        d.manager_id,
                        COUNT(e.id) as employee_count
                    FROM departments d
                    LEFT JOIN employees e ON e.department_id = d.id
                    WHERE d.manager_id = 5
                    GROUP BY d.id, d.name, d.manager_id
                    ORDER BY d.id
                `);

                console.log('✅ Verification result:', result.rows);

                const totalEmployees = result.rows.reduce((sum, row) => sum + parseInt(row.employee_count), 0);

                res.json({
                    success: true,
                    message: 'Manager departments fixed successfully',
                    departments: result.rows,
                    totalEmployees: totalEmployees,
                    allDepartments: deptCheck.rows,
                    allEmployees: empCheck.rows.length
                });
            } catch (error) {
                console.error('❌ Error fixing manager departments:', error);
                res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
            }
        });

        // Create mock manager data endpoint
        app.post("/api/test/create-mock-manager", async (req, res) => {
            try {
                console.log('🎭 Creating mock manager data...');

                // Return mock data without touching database
                const mockManagerData = {
                    managerId: 3,
                    employeeId: 5,
                    departments: [
                        { id: 1, name: 'IT Department', manager_id: 5, employee_count: 5 },
                        { id: 2, name: 'HR Department', manager_id: 5, employee_count: 4 }
                    ],
                    employees: [
                        { id: 1, name: 'John Doe', department: 'IT Department', position: 'Developer' },
                        { id: 2, name: 'Jane Smith', department: 'IT Department', position: 'Designer' },
                        { id: 3, name: 'Bob Wilson', department: 'IT Department', position: 'Tester' },
                        { id: 4, name: 'Alice Brown', department: 'HR Department', position: 'HR Manager' },
                        { id: 5, name: 'Quang Manager', department: 'IT Department', position: 'Team Lead' }
                    ],
                    totalEmployees: 9
                };

                console.log('✅ Mock manager data created:', mockManagerData);
                res.json({
                    success: true,
                    message: 'Mock manager data created successfully',
                    data: mockManagerData
                });
            } catch (error) {
                console.error('❌ Error creating mock data:', error);
                res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
            }
        });
    }
} 