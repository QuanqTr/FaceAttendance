import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";

// Admin pages
import Dashboard from "@/pages/admin/dashboard";
import Attendance from "@/pages/admin/attendance";
import Employees from "@/pages/admin/employees";
import Reports from "@/pages/admin/reports";
import Settings from "@/pages/admin/settings";
import EmployeeDetail from "@/pages/admin/employee-detail";
import EmployeeForm from "@/pages/admin/employee-form";
import LeaveRequestsPage from "@/pages/admin/leave-requests";
import LeaveRequestFormPage from "@/pages/admin/leave-request-form";
import LeaveRequestDetailsPage from "@/pages/admin/leave-request-details";
import AccountsPage from "@/pages/admin/accounts";
import AccountFormPage from "@/pages/admin/account-form";
import Departments from "@/pages/admin/departments";

// Manager pages
import ManagerReports from "@/pages/manager/reports";
import ManagerSettings from "@/pages/manager/settings";
import ManagerDashboard from "@/pages/manager/dashboard";
import ManagerEmployees from "@/pages/manager/employees";
import ManagerEmployeeDetail from "@/pages/manager/employee-detail";
import ManagerEmployeeForm from "@/pages/manager/employee-form";
import ManagerLeaveRequestsPage from "@/pages/manager/leave-requests";
import ManagerLeaveRequestDetailsPage from "@/pages/manager/leave-request-details";
import ManagerLeaveRequestFormPage from "@/pages/manager/leave-request-form";
import ManagerAttendance from "@/pages/manager/attendance";
import ManagerWorkHours from "@/pages/manager/work-hours";

// Public pages
import FaceRecognitionLive from "@/pages/face-recognition-live";

// Providers and auth
import { AuthProvider } from "@/hooks/use-auth";
import { LanguageProvider } from "@/hooks/use-language";
import { ProtectedRoute } from "@/lib/protected-route";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import React from "react";

// User pages
import UserDashboard from "@/pages/user/index";
import UserAttendanceHistory from "@/pages/user/attendance-history";
import UserProfile from "@/pages/user/profile";
import UserLeaveRequests from "@/pages/user/leave-requests";
import UserSettings from "@/pages/user/settings";
import UserReportsPage from "@/pages/user/reports";

// TEST COMPONENTS - Temporary for demo
const TestManagerDashboard = () => <ManagerDashboard />;
const TestManagerEmployees = () => <ManagerEmployees />;
const TestManagerReports = () => <ManagerReports />;
const TestManagerSettings = () => <ManagerSettings />;

// Đảm bảo mỗi component export mặc định một React component
const AuthPageComponent = () => <AuthPage />;
const FaceRecognitionLiveComponent = () => <FaceRecognitionLive />;
const NotFoundComponent = () => <NotFound />;

// Đảm bảo các component user luôn trả về một React element
const UserDashboardComponent = (): React.ReactElement => <UserDashboard />;
const UserAttendanceHistoryComponent = (): React.ReactElement => <UserAttendanceHistory />;
const UserProfileComponent = (): React.ReactElement => <UserProfile />;
const UserLeaveRequestsComponent = (): React.ReactElement => <UserLeaveRequests />;
const UserSettingsComponent = (): React.ReactElement => <UserSettings />;
const UserReportsComponent = (): React.ReactElement => <UserReportsPage />;

// Manager wrapper components
const ManagerReportsComponent = (): React.ReactElement => <ManagerReports />;

// Router cho các trang yêu cầu xác thực
function AuthenticatedRouter(): React.ReactElement {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Switch>
            {/* Manager Routes */}
            <ProtectedRoute path="/manager" component={ManagerDashboard} requiredRoles={["manager"]} />
            <ProtectedRoute path="/manager/employees" component={ManagerEmployees} requiredRoles={["manager"]} />
            <ProtectedRoute path="/manager/employees/new" component={ManagerEmployeeForm} requiredRoles={["manager"]} />
            <ProtectedRoute path="/manager/employees/:id" component={ManagerEmployeeDetail} requiredRoles={["manager"]} />
            <ProtectedRoute path="/manager/employees/:id/edit" component={ManagerEmployeeForm} requiredRoles={["manager"]} />
            <ProtectedRoute path="/manager/leave-requests" component={ManagerLeaveRequestsPage} requiredRoles={["manager"]} />
            <ProtectedRoute path="/manager/leave-requests/new" component={ManagerLeaveRequestFormPage} requiredRoles={["manager"]} />
            <ProtectedRoute path="/manager/leave-requests/:id" component={ManagerLeaveRequestDetailsPage} requiredRoles={["manager"]} />
            <ProtectedRoute path="/manager/attendance" component={ManagerAttendance} requiredRoles={["manager"]} />
            <ProtectedRoute path="/manager/work-hours" component={ManagerWorkHours} requiredRoles={["manager"]} />
            <ProtectedRoute path="/manager/reports" component={ManagerReportsComponent} requiredRoles={["manager"]} />
            <ProtectedRoute path="/manager/settings" component={ManagerSettings} requiredRoles={["manager"]} />

            {/* Admin Routes */}
            <ProtectedRoute path="/" component={Dashboard} requiredRoles={["admin"]} />
            <ProtectedRoute path="/attendance" component={Attendance} requiredRoles={["admin", "manager"]} />
            <ProtectedRoute path="/employees" component={Employees} requiredRoles={["admin"]} />
            <ProtectedRoute path="/employees/new" component={EmployeeForm} requiredRoles={["admin"]} />
            <ProtectedRoute path="/employees/:id" component={EmployeeDetail} requiredRoles={["admin"]} />
            <ProtectedRoute path="/employees/:id/edit" component={EmployeeForm} requiredRoles={["admin"]} />
            <ProtectedRoute path="/departments" component={Departments} requiredRoles={["admin", "manager"]} />
            <ProtectedRoute path="/accounts" component={AccountsPage} requiredRoles={["admin"]} />
            <ProtectedRoute path="/accounts/new" component={AccountFormPage} requiredRoles={["admin"]} />
            <ProtectedRoute path="/accounts/:id/edit" component={AccountFormPage} requiredRoles={["admin"]} />
            <ProtectedRoute path="/leave-requests" component={LeaveRequestsPage} requiredRoles={["admin", "manager"]} />
            <ProtectedRoute path="/leave-requests/new" component={LeaveRequestFormPage} requiredRoles={["admin", "manager"]} />
            <ProtectedRoute path="/leave-requests/:id" component={LeaveRequestDetailsPage} requiredRoles={["admin", "manager"]} />
            <ProtectedRoute path="/profile" component={UserProfileComponent} requiredRoles={["admin", "manager"]} />
            <ProtectedRoute path="/settings" component={() => <Settings />} requiredRoles={["admin"]} />

            {/* Employee Routes */}
            <ProtectedRoute path="/user" component={UserDashboardComponent} />
            <ProtectedRoute path="/user/attendance-history" component={UserAttendanceHistoryComponent} />
            <ProtectedRoute path="/user/profile" component={UserProfileComponent} />
            <ProtectedRoute path="/user/leave-requests" component={UserLeaveRequestsComponent} />
            <ProtectedRoute path="/user/leave-requests/:id" component={LeaveRequestDetailsPage} />
            <ProtectedRoute path="/user/reports" component={UserReportsComponent} />
            <ProtectedRoute path="/user/settings" component={UserSettingsComponent} />

            {/* Reports - accessible for admin and manager only */}
            <ProtectedRoute path="/reports" component={() => <Reports />} requiredRoles={["admin", "manager"]} />

            {/* Public Routes */}
            <Route path="/auth" component={AuthPageComponent} />
            <Route component={NotFoundComponent} />
          </Switch>
        </div>
        <MobileNav />
      </div>
    </AuthProvider>
  );
}

// Router cho các trang công khai
function PublicRouter(): React.ReactElement {
  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/face-recognition-live" component={FaceRecognitionLiveComponent} />
        <Route component={NotFoundComponent} />
      </Switch>
    </div>
  );
}

function App(): React.ReactElement {
  // Kiểm tra nếu đang ở trang face-recognition-live
  const isPublicRoute = window.location.pathname === '/face-recognition-live';

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          {isPublicRoute ? (
            <PublicRouter />
          ) : (
            <AuthenticatedRouter />
          )}
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

// Test Manager Router - để demo giao diện manager
function TestManagerRouter(): React.ReactElement {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Switch>
            <Route path="/test-manager" component={TestManagerDashboard} />
            <Route path="/test-manager/employees" component={TestManagerEmployees} />
            <Route path="/test-manager/reports" component={TestManagerReports} />
            <Route path="/test-manager/settings" component={TestManagerSettings} />
            <Route component={() => <TestManagerDashboard />} />
          </Switch>
        </div>
        <MobileNav />
      </div>
    </AuthProvider>
  );
}

export default App;

