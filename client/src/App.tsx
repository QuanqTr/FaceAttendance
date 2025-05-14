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

// Đảm bảo mỗi component export mặc định một React component
const AuthPageComponent = () => <AuthPage />;
const FaceRecognitionLiveComponent = () => <FaceRecognitionLive />;
const NotFoundComponent = () => <NotFound />;

function Router(): React.ReactElement {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Switch>
          <ProtectedRoute path="/" component={Dashboard} />
          <ProtectedRoute path="/attendance" component={Attendance} />
          <ProtectedRoute path="/employees" component={Employees} />
          <ProtectedRoute path="/employees/new" component={EmployeeForm} />
          <ProtectedRoute path="/employees/:id" component={EmployeeDetail} />
          <ProtectedRoute path="/employees/:id/edit" component={EmployeeForm} />
          <ProtectedRoute path="/accounts" component={AccountsPage} />
          <ProtectedRoute path="/accounts/new" component={AccountFormPage} />
          <ProtectedRoute path="/accounts/:id/edit" component={AccountFormPage} />
          <ProtectedRoute path="/leave-requests" component={LeaveRequestsPage} />
          <ProtectedRoute path="/leave-requests/new" component={LeaveRequestFormPage} />
          <ProtectedRoute path="/salary" component={SalaryPage} />
          <ProtectedRoute path="/salary/new" component={SalaryFormPage} />
          <ProtectedRoute path="/reports" component={Reports} />
          <ProtectedRoute path="/settings" component={Settings} />
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

