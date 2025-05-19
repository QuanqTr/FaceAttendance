import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Attendance from "@/pages/attendance";
import Employees from "@/pages/employees";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import EmployeeDetail from "@/pages/employee-detail";
import EmployeeForm from "@/pages/employee-form";
import LeaveRequestsPage from "@/pages/leave-requests";
import LeaveRequestFormPage from "@/pages/leave-request-form";
import LeaveRequestDetailsPage from "@/pages/leave-request-details";
import ManagerLeaveRequestsPage from "@/pages/manager/leave-requests";
import SalaryPage from "@/pages/salary";
import SalaryFormPage from "@/pages/salary-form";
import AccountsPage from "@/pages/accounts";
import AccountFormPage from "@/pages/account-form";
import FaceRecognitionLive from "@/pages/face-recognition-live";
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
import UserSalary from "@/pages/user/salary";
import UserSettings from "@/pages/user/settings";

// Đảm bảo mỗi component export mặc định một React component
const AuthPageComponent = () => <AuthPage />;
const FaceRecognitionLiveComponent = () => <FaceRecognitionLive />;
const NotFoundComponent = () => <NotFound />;

// Đảm bảo các component user luôn trả về một React element
const UserDashboardComponent = () => <UserDashboard />;
const UserAttendanceHistoryComponent = () => <UserAttendanceHistory />;
const UserProfileComponent = () => <UserProfile />;
const UserLeaveRequestsComponent = () => <UserLeaveRequests />;
const UserSalaryComponent = () => <UserSalary />;
const UserSettingsComponent = () => <UserSettings />;

function Router(): React.ReactElement {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Switch>
          {/* Admin & Manager Routes */}
          <ProtectedRoute path="/" component={Dashboard} requiredRoles={["admin", "manager"]} />
          <ProtectedRoute path="/attendance" component={Attendance} requiredRoles={["admin", "manager"]} />
          <ProtectedRoute path="/employees" component={Employees} requiredRoles={["admin", "manager"]} />
          <ProtectedRoute path="/employees/new" component={EmployeeForm} requiredRoles={["admin", "manager"]} />
          <ProtectedRoute path="/employees/:id" component={EmployeeDetail} requiredRoles={["admin", "manager"]} />
          <ProtectedRoute path="/employees/:id/edit" component={EmployeeForm} requiredRoles={["admin", "manager"]} />
          <ProtectedRoute path="/accounts" component={AccountsPage} requiredRoles={["admin"]} />
          <ProtectedRoute path="/accounts/new" component={AccountFormPage} requiredRoles={["admin"]} />
          <ProtectedRoute path="/accounts/:id/edit" component={AccountFormPage} requiredRoles={["admin"]} />
          <ProtectedRoute path="/leave-requests" component={LeaveRequestsPage} requiredRoles={["admin", "manager"]} />
          <ProtectedRoute path="/leave-requests/new" component={LeaveRequestFormPage} requiredRoles={["admin", "manager"]} />
          <ProtectedRoute path="/leave-requests/:id" component={LeaveRequestDetailsPage} requiredRoles={["admin", "manager"]} />
          <ProtectedRoute path="/manager/leave-requests" component={ManagerLeaveRequestsPage} requiredRoles={["admin", "manager"]} />
          <ProtectedRoute path="/salary" component={SalaryPage} requiredRoles={["admin", "manager"]} />
          <ProtectedRoute path="/salary/new" component={SalaryFormPage} requiredRoles={["admin", "manager"]} />
          <ProtectedRoute path="/reports" component={Reports} requiredRoles={["admin", "manager"]} />
          <ProtectedRoute path="/settings" component={Settings} requiredRoles={["admin", "manager"]} />

          {/* Employee Routes */}
          <ProtectedRoute path="/user" component={UserDashboardComponent} />
          <ProtectedRoute path="/user/attendance-history" component={UserAttendanceHistoryComponent} />
          <ProtectedRoute path="/user/profile" component={UserProfileComponent} />
          <ProtectedRoute path="/user/leave-requests" component={UserLeaveRequestsComponent} />
          <ProtectedRoute path="/user/leave-requests/:id" component={LeaveRequestDetailsPage} />
          <ProtectedRoute path="/user/salary" component={UserSalaryComponent} />
          <ProtectedRoute path="/user/settings" component={UserSettingsComponent} />

          {/* Public Routes */}
          <Route path="/auth" component={AuthPageComponent} />
          <Route path="/face-recognition-live" component={FaceRecognitionLiveComponent} />
          <Route component={NotFoundComponent} />
        </Switch>
      </div>
      <MobileNav />
    </div>
  );
}

// Tạo layout riêng cho trang nhận diện khuôn mặt không cần menu bên
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
  // Kiểm tra nếu đang ở trang face-recognition-live thì sử dụng PublicRouter
  const isPublicRoute = window.location.pathname.includes('face-recognition-live');

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            {isPublicRoute ? <PublicRouter /> : <Router />}
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
export default App;

