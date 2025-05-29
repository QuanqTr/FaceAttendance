import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, LoginData } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<Omit<SelectUser, "password">, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  refreshSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [sessionError, setSessionError] = useState<Error | null>(null);

  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });

        if (res.status === 401) {
          return null;
        }

        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }

        return await res.json();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setSessionError(error);
        console.error("Session query error:", error);
        return null;
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (error && !error.message.includes("401")) {
      console.error("Session error:", error);
    }
  }, [error]);

  const refreshSession = async () => {
    try {
      console.log("Refreshing session...");
      const result = await refetch();
      return !!result.data;
    } catch (e) {
      console.error("Refresh session error:", e);
      return false;
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Attempting login...");
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
          credentials: "include",
        });

        console.log("Login response status:", res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Login error response:", errorText);
          throw new Error(errorText || res.statusText);
        }

        const data = await res.json();
        console.log("Login successful, user data received");
        return data;
      } catch (error) {
        console.error("Login request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.fullName}!`,
      });

      console.log("Login successful, redirecting based on role");

      // Always redirect to role-specific dashboard, no callback to previous interface
      let dashboardUrl = '/';
      if (data.role === 'employee') {
        dashboardUrl = '/user';
      } else if (data.role === 'manager') {
        dashboardUrl = '/manager';
      } else if (data.role === 'admin') {
        dashboardUrl = '/';
      }

      setTimeout(() => {
        window.location.replace(dashboardUrl);
      }, 100);
    },
    onError: (error: Error) => {
      console.error("Login mutation error:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(res.statusText);
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      window.location.replace("/auth");
    },
    onError: () => {
      queryClient.setQueryData(["/api/user"], null);
      window.location.replace("/auth");
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error: sessionError || error,
        loginMutation,
        logoutMutation,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
