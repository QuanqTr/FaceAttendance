import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";



export function ProtectedRoute({
  path,
  component: Component,
  requiredRoles = [],
}: {
  path: string;
  component: () => React.ReactElement | null;
  requiredRoles?: string[];
}) {
  const { user, isLoading, refreshSession } = useAuth();
  const [location] = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);


  // Kiểm tra và làm mới session khi component mount
  useEffect(() => {
    const checkSession = async () => {
      if (!user && !isLoading && !isRefreshing && !sessionChecked) {
        console.log("ProtectedRoute: Checking session at path:", path);
        setIsRefreshing(true);

        try {
          if (location !== '/auth') {
            console.log("ProtectedRoute: Saving current location for redirect:", location);
            sessionStorage.setItem('redirectAfterLogin', location);
          }

          console.log("ProtectedRoute: Attempting to refresh session...");
          const hasSession = await refreshSession();
          console.log("ProtectedRoute: Session refresh result:", hasSession);

          setSessionChecked(true);
        } catch (error) {
          console.error("ProtectedRoute: Failed to refresh session:", error);
          setSessionChecked(true);
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    checkSession();
  }, [user, isLoading, location, refreshSession, isRefreshing, sessionChecked, path]);

  // Hiển thị loading trong khi đang tải hoặc đang refresh session
  if (isLoading || isRefreshing) {
    console.log("ProtectedRoute: Showing loading state for path:", path);
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Chuyển hướng đến trang đăng nhập nếu không có user
  if (!user) {
    if (location !== '/auth') {
      console.log("ProtectedRoute: No authenticated user, redirecting to login from path:", path);
      sessionStorage.setItem('redirectAfterLogin', location);
    }

    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Kiểm tra quyền truy cập dựa trên vai trò
  if (path.startsWith('/user') && user.role !== 'employee') {
    console.log(`ProtectedRoute: Non-employee user (${user.role}) cannot access employee route ${path}`);
    return (
      <Route path={path}>
        <Redirect to={user.role === 'manager' ? '/manager' : '/'} />
      </Route>
    );
  }

  if (!path.startsWith('/user') && !path.startsWith('/manager') && user.role === 'employee') {
    console.log(`ProtectedRoute: Employee user cannot access admin route ${path}`);
    return (
      <Route path={path}>
        <Redirect to="/user" />
      </Route>
    );
  }

  // Kiểm tra các quyền bổ sung nếu được chỉ định
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    console.log(`ProtectedRoute: User role ${user.role} not authorized for ${path}, required roles: ${requiredRoles.join(', ')}`);

    const redirectPath = user.role === 'employee' ? '/user' : user.role === 'manager' ? '/manager' : '/';

    // Hiển thị alert ngay lập tức và chuyển hướng
    setTimeout(() => {
      alert('⚠️ Không có quyền truy cập\nBạn sẽ được chuyển hướng về trang chính');
      window.location.replace(redirectPath);
    }, 0);

    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-500 text-lg font-semibold">⚠️ Không có quyền truy cập</div>
            <div className="text-sm text-gray-600 mt-2">Đang chuyển hướng...</div>
          </div>
        </div>
      </Route>
    );
  }

  // Render component nếu đã đăng nhập và có quyền
  console.log(`ProtectedRoute: User authenticated with role ${user.role}, rendering component for path:`, path);
  return <Route path={path} component={Component} />;
}
