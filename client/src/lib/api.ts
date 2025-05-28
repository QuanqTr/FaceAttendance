import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Hàm helper để lấy token từ localStorage
const getAuthToken = () => {
    return localStorage.getItem('authToken');
};

// Hàm chính để thực hiện các API request
export async function apiRequest<T = any>(
    method: string,
    url: string,
    data?: any,
    config: AxiosRequestConfig = {}
): Promise<AxiosResponse<T>> {
    const token = getAuthToken();

    // Merge config với default config
    const requestConfig: AxiosRequestConfig = {
        ...config,
        method,
        url,
        data,
        headers: {
            ...config.headers,
            'Content-Type': 'application/json',
            // Thêm Authorization header nếu có token
            ...(token && { Authorization: `Bearer ${token}` }),
        },
    };

    try {
        const response = await axios<T>(requestConfig);
        return response;
    } catch (error: any) {
        // Xử lý các lỗi phổ biến
        if (error.response) {
            // Server trả về response với status code nằm ngoài range 2xx
            const { status, data } = error.response;

            // Xử lý lỗi authentication
            if (status === 401) {
                // Token hết hạn hoặc không hợp lệ
                localStorage.removeItem('authToken');
                window.location.href = '/auth';
            }

            // Xử lý lỗi forbidden với redirect
            if (status === 403 && data.redirectTo) {
                alert(data.message || 'Không có quyền truy cập');
                window.location.replace(data.redirectTo); // Sử dụng replace thay vì href để ngăn quay lại trang trước
                return new Promise(() => { }); // Prevent further execution
            }

            // Throw error với message từ server nếu có
            throw new Error(data.message || 'An error occurred');
        } else if (error.request) {
            // Request được gửi nhưng không nhận được response
            throw new Error('No response received from server');
        } else {
            // Có lỗi khi setup request
            throw new Error(error.message || 'Error setting up request');
        }
    }
} 