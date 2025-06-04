import { Request, Response } from "express";
import { storage } from "../models/storage";

// Get manager's department info
export const getDepartmentInfo = async (req: Request, res: Response) => {
  try {
    const managerId = req.user?.id;

    if (!managerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get manager's department
    const manager = await storage.getEmployeeById(managerId);
    if (!manager || !manager.departmentId) {
      return res.status(404).json({ error: "Manager department not found" });
    }

    // Get department details
    const department = await storage.getDepartmentById(manager.departmentId);
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Get department employees
    const employees = await storage.getEmployeesByDepartment(manager.departmentId);

    const departmentInfo = {
      id: department.id,
      name: department.name,
      code: department.code,
      description: department.description,
      totalEmployees: employees.length,
      activeEmployees: employees.filter(emp => emp.isActive).length,
      presentToday: Math.floor(employees.length * 0.8), // Mock calculation
      manager: manager.fullName
    };

    res.json(departmentInfo);
  } catch (error) {
    console.error("Error getting department info:", error);
    res.status(500).json({ error: "Failed to get department info" });
  }
};

// Get daily stats for manager's department
export const getDailyStats = async (req: Request, res: Response) => {
  try {
    const managerId = req.user?.id;

    if (!managerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get manager's department
    const manager = await storage.getEmployeeById(managerId);
    if (!manager || !manager.departmentId) {
      return res.status(404).json({ error: "Manager department not found" });
    }

    // Get department employees
    const employees = await storage.getEmployeesByDepartment(manager.departmentId);
    const totalEmployees = employees.length;

    // Mock daily stats based on department size
    const present = Math.floor(totalEmployees * 0.8);
    const absent = totalEmployees - present;
    const late = Math.floor(present * 0.2);
    const onTime = present - late;

    const dailyStats = {
      present,
      absent,
      late,
      onTime,
      attendanceRate: totalEmployees > 0 ? (present / totalEmployees * 100) : 0,
      onTimeRate: present > 0 ? (onTime / present * 100) : 0,
      productivityScore: 85 // Mock score
    };

    res.json(dailyStats);
  } catch (error) {
    console.error("Error getting daily stats:", error);
    res.status(500).json({ error: "Failed to get daily stats" });
  }
};

// Get pending counts for manager
export const getPendingCounts = async (req: Request, res: Response) => {
  try {
    const managerId = req.user?.id;

    if (!managerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Mock pending counts - in real system would query leave requests, etc.
    const pendingCounts = {
      leaveRequests: 3,
      timeOffRequests: 2,
      overtimeRequests: 1,
      total: 6
    };

    res.json(pendingCounts);
  } catch (error) {
    console.error("Error getting pending counts:", error);
    res.status(500).json({ error: "Failed to get pending counts" });
  }
};

// Get department employees for manager
export const getDepartmentEmployees = async (req: Request, res: Response) => {
  try {
    const managerId = req.user?.id;

    if (!managerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get manager's department
    const manager = await storage.getEmployeeById(managerId);
    if (!manager || !manager.departmentId) {
      return res.status(404).json({ error: "Manager department not found" });
    }

    // Get department employees with department info
    const employees = await storage.getEmployeesByDepartment(manager.departmentId);

    // Return in expected format
    res.json({
      employees,
      total: employees.length
    });
  } catch (error) {
    console.error("Error getting department employees:", error);
    res.status(500).json({ error: "Failed to get department employees" });
  }
};

// Get department overall stats
export const getDepartmentOverallStats = async (req: Request, res: Response) => {
  try {
    const { month } = req.query;
    const managerId = req.user?.id;
    
    if (!managerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get manager's department
    const manager = await storage.getEmployeeById(managerId);
    if (!manager || !manager.departmentId) {
      return res.status(404).json({ error: "Manager department not found" });
    }

    // Get department employees
    const employees = await storage.getEmployeesByDepartment(manager.departmentId);
    
    // Calculate real stats for department
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(emp => emp.isActive).length;
    const absentEmployees = totalEmployees - activeEmployees;

    // Get real attendance data from database
    const monthDate = month ? new Date(month as string) : new Date();
    const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    // Get work hours for all department employees in the month
    const workHoursPromises = employees.map(emp =>
      storage.getWorkHoursByEmployeeAndDateRange(emp.id, startOfMonth, endOfMonth)
    );
    const allWorkHours = await Promise.all(workHoursPromises);
    const flatWorkHours = allWorkHours.flat();

    // Calculate real stats from work hours data
    const totalHours = flatWorkHours.reduce((sum, wh) => sum + (wh.totalHours || 0), 0);
    const totalOvertimeHours = flatWorkHours.reduce((sum, wh) => sum + (wh.overtimeHours || 0), 0);
    const totalLateMinutes = flatWorkHours.reduce((sum, wh) => sum + (wh.lateMinutes || 0), 0);
    const totalPenaltyAmount = flatWorkHours.reduce((sum, wh) => sum + (wh.penaltyAmount || 0), 0);

    // Calculate leave days (simplified - count days with 0 hours)
    const totalLeaveDays = flatWorkHours.filter(wh => (wh.totalHours || 0) === 0).length;

    const stats = {
      totalEmployees,
      totalHours: Math.round(totalHours * 100) / 100,
      avgHoursPerEmployee: totalEmployees > 0 ? Math.round((totalHours / totalEmployees) * 100) / 100 : 0,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      avgOvertimePerEmployee: totalEmployees > 0 ? Math.round((totalOvertimeHours / totalEmployees) * 100) / 100 : 0,
      totalLeaveDays,
      avgLeaveDaysPerEmployee: totalEmployees > 0 ? Math.round((totalLeaveDays / totalEmployees) * 100) / 100 : 0,
      totalLateMinutes,
      avgLateMinutesPerEmployee: totalEmployees > 0 ? Math.round((totalLateMinutes / totalEmployees) * 100) / 100 : 0,
      totalPenaltyAmount,
      avgPenaltyPerEmployee: totalEmployees > 0 ? Math.round((totalPenaltyAmount / totalEmployees) * 100) / 100 : 0,
      activeEmployees,
      absentEmployees
    };

    res.json(stats);
  } catch (error) {
    console.error("Error getting department stats:", error);
    res.status(500).json({ error: "Failed to get department stats" });
  }
};

// Get department attendance records
export const getDepartmentAttendanceRecords = async (req: Request, res: Response) => {
  try {
    const { month } = req.query;
    const managerId = req.user?.id;
    
    if (!managerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get manager's department
    const manager = await storage.getEmployeeById(managerId);
    if (!manager || !manager.departmentId) {
      return res.status(404).json({ error: "Manager department not found" });
    }

    // Get department employees
    const employees = await storage.getEmployeesByDepartment(manager.departmentId);

    // Get real attendance records for department employees
    const monthDate = month ? new Date(month as string) : new Date();
    const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    const records = await Promise.all(employees.map(async (emp, index) => {
      const workHours = await storage.getWorkHoursByEmployeeAndDateRange(emp.id, startOfMonth, endOfMonth);

      // Aggregate work hours for the month
      const totalHours = workHours.reduce((sum, wh) => sum + (wh.totalHours || 0), 0);
      const overtimeHours = workHours.reduce((sum, wh) => sum + (wh.overtimeHours || 0), 0);
      const lateMinutes = workHours.reduce((sum, wh) => sum + (wh.lateMinutes || 0), 0);
      const earlyMinutes = workHours.reduce((sum, wh) => sum + (wh.earlyMinutes || 0), 0);
      const penaltyAmount = workHours.reduce((sum, wh) => sum + (wh.penaltyAmount || 0), 0);
      const leaveDays = workHours.filter(wh => (wh.totalHours || 0) === 0).length;

      return {
        id: index + 1,
        employeeId: emp.id,
        employeeName: emp.fullName,
        position: emp.position || "Employee",
        month: monthDate.getMonth() + 1,
        year: monthDate.getFullYear(),
        totalHours: Math.round(totalHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        leaveDays,
        earlyMinutes,
        lateMinutes,
        penaltyAmount,
        createdAt: new Date().toISOString()
      };
    }));

    res.json(records);
  } catch (error) {
    console.error("Error getting attendance records:", error);
    res.status(500).json({ error: "Failed to get attendance records" });
  }
};

// Get department top performers
export const getDepartmentTopPerformers = async (req: Request, res: Response) => {
  try {
    const { month } = req.query;
    const managerId = req.user?.id;
    
    if (!managerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get manager's department
    const manager = await storage.getEmployeeById(managerId);
    if (!manager || !manager.departmentId) {
      return res.status(404).json({ error: "Manager department not found" });
    }

    // Get department employees
    const employees = await storage.getEmployeesByDepartment(manager.departmentId);

    // Get real performance data and calculate top performers
    const monthDate = month ? new Date(month as string) : new Date();
    const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    const performersData = await Promise.all(employees.map(async (emp) => {
      const workHours = await storage.getWorkHoursByEmployeeAndDateRange(emp.id, startOfMonth, endOfMonth);

      const totalHours = workHours.reduce((sum, wh) => sum + (wh.totalHours || 0), 0);
      const overtimeHours = workHours.reduce((sum, wh) => sum + (wh.overtimeHours || 0), 0);
      const lateMinutes = workHours.reduce((sum, wh) => sum + (wh.lateMinutes || 0), 0);
      const penaltyAmount = workHours.reduce((sum, wh) => sum + (wh.penaltyAmount || 0), 0);

      return {
        employeeId: emp.id,
        employeeName: emp.fullName,
        position: emp.position || "Employee",
        totalHours: Math.round(totalHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        lateMinutes,
        penaltyAmount
      };
    }));

    // Sort by total hours (descending) and take top 5
    const performers = performersData
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 5);

    res.json(performers);
  } catch (error) {
    console.error("Error getting top performers:", error);
    res.status(500).json({ error: "Failed to get top performers" });
  }
};

// Get department penalty analysis
export const getDepartmentPenaltyAnalysis = async (req: Request, res: Response) => {
  try {
    const { month } = req.query;
    const managerId = req.user?.id;
    
    if (!managerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get manager's department
    const manager = await storage.getEmployeeById(managerId);
    if (!manager || !manager.departmentId) {
      return res.status(404).json({ error: "Manager department not found" });
    }

    // Get department employees
    const employees = await storage.getEmployeesByDepartment(manager.departmentId);

    // Get real penalty analysis for department
    const monthDate = month ? new Date(month as string) : new Date();
    const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    const analysis = await Promise.all(employees.map(async (emp) => {
      const workHours = await storage.getWorkHoursByEmployeeAndDateRange(emp.id, startOfMonth, endOfMonth);

      const lateMinutes = workHours.reduce((sum, wh) => sum + (wh.lateMinutes || 0), 0);
      const earlyMinutes = workHours.reduce((sum, wh) => sum + (wh.earlyMinutes || 0), 0);
      const penaltyAmount = workHours.reduce((sum, wh) => sum + (wh.penaltyAmount || 0), 0);

      // Determine penalty level based on penalty amount
      let penaltyLevel = "Không phạt";
      if (penaltyAmount > 100000) {
        penaltyLevel = "Phạt nặng";
      } else if (penaltyAmount > 50000) {
        penaltyLevel = "Phạt trung bình";
      } else if (penaltyAmount > 0) {
        penaltyLevel = "Phạt nhẹ";
      }

      return {
        employeeId: emp.id,
        employeeName: emp.fullName,
        position: emp.position || "Employee",
        lateMinutes,
        earlyMinutes,
        penaltyAmount,
        penaltyLevel
      };
    }));

    res.json(analysis);
  } catch (error) {
    console.error("Error getting penalty analysis:", error);
    res.status(500).json({ error: "Failed to get penalty analysis" });
  }
};

// Get department attendance trends
export const getDepartmentAttendanceTrends = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    const managerId = req.user?.id;
    
    if (!managerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get manager's department
    const manager = await storage.getEmployeeById(managerId);
    if (!manager || !manager.departmentId) {
      return res.status(404).json({ error: "Manager department not found" });
    }

    // Get department employees count
    const employees = await storage.getEmployeesByDepartment(manager.departmentId);
    const employeeCount = employees.length;

    // Get real trends for 12 months
    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

    const trends = await Promise.all(Array.from({ length: 12 }, async (_, index) => {
      const month = index + 1;
      const startOfMonth = new Date(currentYear, month - 1, 1);
      const endOfMonth = new Date(currentYear, month, 0);

      // Get work hours for all department employees in this month
      const workHoursPromises = employees.map(emp =>
        storage.getWorkHoursByEmployeeAndDateRange(emp.id, startOfMonth, endOfMonth)
      );
      const allWorkHours = await Promise.all(workHoursPromises);
      const flatWorkHours = allWorkHours.flat();

      const totalHours = flatWorkHours.reduce((sum, wh) => sum + (wh.totalHours || 0), 0);
      const totalOvertime = flatWorkHours.reduce((sum, wh) => sum + (wh.overtimeHours || 0), 0);
      const totalLeaveDays = flatWorkHours.filter(wh => (wh.totalHours || 0) === 0).length;
      const totalPenalties = flatWorkHours.reduce((sum, wh) => sum + (wh.penaltyAmount || 0), 0);

      return {
        month,
        employeeCount,
        totalHours: Math.round(totalHours * 100) / 100,
        avgHours: employeeCount > 0 ? Math.round((totalHours / employeeCount) * 100) / 100 : 0,
        totalOvertime: Math.round(totalOvertime * 100) / 100,
        totalLeaveDays,
        totalPenalties
      };
    }));

    res.json(trends);
  } catch (error) {
    console.error("Error getting attendance trends:", error);
    res.status(500).json({ error: "Failed to get attendance trends" });
  }
};
