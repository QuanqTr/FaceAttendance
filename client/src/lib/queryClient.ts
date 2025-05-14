import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { mockDepartments, mockEmployees } from "./mock-data";

// Map các URL API đến dữ liệu mẫu
const API_MOCKS: Record<string, any> = {
  "/api/departments": mockDepartments,
  "/api/employees": { employees: mockEmployees, total: mockEmployees.length }
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(`401: ${res.statusText || "Unauthorized - Session expired"}`);
    }

    try {
      // Thử đọc response text
      const text = await res.text();

      // Kiểm tra nếu đây là HTML thay vì JSON
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error(`${res.status}: Server returned HTML instead of JSON (possible server error)`);
      }

      // Thử parse JSON nếu có
      try {
        const jsonData = JSON.parse(text);
        // Nếu có thông báo lỗi cụ thể từ API, sử dụng nó
        if (jsonData && jsonData.message) {
          throw new Error(`${res.status}: ${jsonData.message}`);
        }
      } catch (jsonError) {
        // Nếu không parse được JSON, sử dụng text gốc
        console.error("Could not parse error response as JSON:", jsonError);
      }

      throw new Error(`${res.status}: ${text || res.statusText}`);
    } catch (error) {
      if (error instanceof Error) {
        throw error; // Nếu đã là Error object, throw lại
      }
      // Nếu không đọc được response text
      throw new Error(`${res.status}: ${res.statusText || "Unknown error"}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API Request error (${method} ${url}):`, error);
    throw error;
  }
}

// Trả về giá trị mock nếu URL khớp với key trong API_MOCKS
function getMockDataForUrl(url: string): any | null {
  // Xử lý url có thể chứa tham số truy vấn
  const baseUrl = url.split('?')[0];

  return API_MOCKS[baseUrl] || null;
}

type UnauthorizedBehavior = "returnNull" | "throw" | "redirect";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const url = queryKey[0] as string;

      try {
        const res = await fetch(url, {
          credentials: "include",
        });

        if (res.status === 401) {
          if (unauthorizedBehavior === "returnNull") {
            return null;
          } else if (unauthorizedBehavior === "redirect") {
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
            window.location.replace("/auth");
            return null;
          }
          await throwIfResNotOk(res);
        }

        // Kiểm tra status code trước
        if (!res.ok) {
          // Kiểm tra xem có dữ liệu mẫu không khi gặp lỗi 5xx
          if (res.status >= 500) {
            const mockData = getMockDataForUrl(url);
            if (mockData) {
              console.warn(`API ${url} gặp lỗi ${res.status}, sử dụng dữ liệu mẫu.`);
              return mockData;
            }
          }
          await throwIfResNotOk(res);
        }

        // Đọc và parse JSON một cách an toàn
        try {
          return await res.json();
        } catch (error) {
          console.error("Error parsing JSON response:", error);

          // Kiểm tra lại dữ liệu mẫu nếu parse JSON thất bại
          const mockData = getMockDataForUrl(url);
          if (mockData) {
            console.warn(`Parse JSON thất bại cho ${url}, sử dụng dữ liệu mẫu.`);
            return mockData;
          }

          throw new Error("Invalid JSON response from server");
        }
      } catch (error) {
        console.error(`Query error (${url}):`, error);

        // Thử sử dụng dữ liệu mẫu cho bất kỳ lỗi nào
        const mockData = getMockDataForUrl(url);
        if (mockData) {
          console.warn(`Query lỗi cho ${url}, sử dụng dữ liệu mẫu.`);
          return mockData;
        }

        throw error;
      }
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 15 * 60 * 1000, // 15 phút - phù hợp với session
      retry: 2, // Cho phép thử lại 2 lần
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000), // Tăng thời gian thử lại
    },
    mutations: {
      retry: 1, // Cho phép thử lại 1 lần
      retryDelay: 1000, // Thử lại sau 1 giây
    },
  },
});
