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
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

function Router() {
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
          <ProtectedRoute path="/leave-requests" component={LeaveRequestsPage} />
          <ProtectedRoute path="/leave-requests/new" component={LeaveRequestFormPage} />
          <ProtectedRoute path="/salary" component={SalaryPage} />
          <ProtectedRoute path="/salary/new" component={SalaryFormPage} />
          <ProtectedRoute path="/reports" component={Reports} />
          <ProtectedRoute path="/settings" component={Settings} />
          <Route path="/auth" component={AuthPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <MobileNav />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
