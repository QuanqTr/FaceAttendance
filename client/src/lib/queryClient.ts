import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { mockDepartments, mockEmployees } from "./mock-data";

// Map các URL API đến dữ liệu mẫu
const API_MOCKS: Record<string, any> = {
  "/api/departments": mockDepartments,
  "/api/employees": { employees: mockEmployees, total: mockEmployees.length }
};

export interface ApiResponse extends Response {
  data?: any;
  errorData?: any;
}

async function throwIfResNotOk(res: Response, preReadText?: string): Promise<any> {
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Phiên đăng nhập đã hết hạn");
    }

    try {
      // Sử dụng text đã đọc trước đó nếu có, nếu không đọc từ response
      const text = preReadText || await res.text();

      // Kiểm tra nếu đây là HTML thay vì JSON
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error("Lỗi server - vui lòng thử lại sau");
      }

      // Thử parse JSON nếu có
      try {
        const jsonData = JSON.parse(text);
        // Trả về dữ liệu JSON nếu được yêu cầu
        if (preReadText === undefined) {
          return jsonData; // Trả về dữ liệu khi được gọi để lấy dữ liệu
        }

        if (jsonData && jsonData.message) {
          // Làm sạch message
          let cleanMessage = jsonData.message;
          cleanMessage = cleanMessage.replace(/^message\s*:\s*/i, '');
          cleanMessage = cleanMessage.replace(/^\s*["']\s*/, '').replace(/\s*["']\s*$/, '');
          throw new Error(cleanMessage);
        }
      } catch (jsonError) {
        // Nếu không parse được JSON, sử dụng text gốc
        console.error("Could not parse error response as JSON:", jsonError);
      }

      // Làm sạch text response
      let cleanText = text || res.statusText || "Đã xảy ra lỗi";

      // Nếu text chứa JSON string, cố gắng extract message
      if (cleanText.includes('message')) {
        const messageMatch = cleanText.match(/"message"\s*:\s*"([^"]+)"/);
        if (messageMatch) {
          cleanText = messageMatch[1];
        }
      }

      // Loại bỏ các ký tự JSON không cần thiết
      cleanText = cleanText.replace(/^\s*[{\[\]}\s]*/, '').replace(/[}\]\s]*\s*$/, '');
      cleanText = cleanText.replace(/^\s*["']\s*/, '').replace(/\s*["']\s*$/, '');

      throw new Error(cleanText);
    } catch (error) {
      if (error instanceof Error) {
        throw error; // Nếu đã là Error object, throw lại
      }
      // Nếu không đọc được response text
      throw new Error(res.statusText || "Đã xảy ra lỗi");
    }
  }
  return null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<ApiResponse> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    const enhancedResponse = res as ApiResponse;

    // Xử lý response không ok
    if (!res.ok) {
      // Đọc text từ response chỉ một lần
      const responseText = await res.text();

      try {
        // Parse JSON từ text đã đọc
        const errorData = JSON.parse(responseText);
        enhancedResponse.errorData = errorData;

        // Trích xuất message từ JSON và làm sạch
        let errorMessage = errorData.message || res.statusText || 'Đã xảy ra lỗi';

        // Loại bỏ các từ khóa không cần thiết
        errorMessage = errorMessage.replace(/^message\s*:\s*/i, '');
        errorMessage = errorMessage.replace(/^\s*["']\s*/, '').replace(/\s*["']\s*$/, '');

        const error = new Error(errorMessage);
        Object.defineProperty(error, 'response', {
          value: enhancedResponse,
          enumerable: true,
          configurable: true
        });
        throw error;
      } catch (parseError) {
        // Nếu không parse được JSON - làm sạch response text
        let cleanText = responseText || res.statusText || 'Đã xảy ra lỗi';

        // Nếu responseText chứa JSON string, cố gắng extract message
        if (cleanText.includes('message')) {
          // Tìm và extract nội dung sau "message":"
          const messageMatch = cleanText.match(/"message"\s*:\s*"([^"]+)"/);
          if (messageMatch) {
            cleanText = messageMatch[1];
          }
        }

        // Loại bỏ các ký tự JSON không cần thiết
        cleanText = cleanText.replace(/^\s*[{\[\]}\s]*/, '').replace(/[}\]\s]*\s*$/, '');
        cleanText = cleanText.replace(/^\s*["']\s*/, '').replace(/\s*["']\s*$/, '');

        const error = new Error(cleanText);
        Object.defineProperty(error, 'response', {
          value: enhancedResponse,
          enumerable: true,
          configurable: true
        });
        throw error;
      }
    }

    // Thêm data property nếu response là JSON
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const responseData = await res.json();
      enhancedResponse.data = responseData;
    }

    return enhancedResponse;
  } catch (error) {
    console.error(`API Request error (${method} ${url}):`, error);
    throw error;
  }
}

// Helper methods for common HTTP methods
apiRequest.get = async (url: string): Promise<ApiResponse> => {
  return apiRequest('GET', url);
};

apiRequest.post = async (url: string, data?: unknown): Promise<ApiResponse> => {
  return apiRequest('POST', url, data);
};

apiRequest.put = async (url: string, data?: unknown): Promise<ApiResponse> => {
  return apiRequest('PUT', url, data);
};

apiRequest.delete = async (url: string): Promise<ApiResponse> => {
  return apiRequest('DELETE', url);
};

apiRequest.patch = async (url: string, data?: unknown): Promise<ApiResponse> => {
  return apiRequest('PATCH', url, data);
};

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
