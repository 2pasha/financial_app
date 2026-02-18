import axios from 'axios';
import type { API } from '@financial-app/common-types';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Get token from Clerk
    const token = await (window as any).Clerk?.session?.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export const monobankApi = {
  async saveToken(token: string): Promise<API.SaveTokenResponse> {
    const response = await apiClient.post<API.SaveTokenResponse>('/monobank/token', {
      token,
    });
    return response.data;
  },

  async checkTokenStatus(): Promise<API.TokenStatusResponse> {
    const response = await apiClient.get<API.TokenStatusResponse>('/monobank/token/status');
    return response.data;
  },

  async syncTransactions(): Promise<API.SyncResponse> {
    const response = await apiClient.post<API.SyncResponse>('/monobank/sync');
    return response.data;
  },

  async syncIncremental(): Promise<API.SyncResponse> {
    const response = await apiClient.post<API.SyncResponse>('/monobank/sync/incremental');
    return response.data;
  },

  async getTransactions(params?: {
    page?: number;
    limit?: number;
  }): Promise<any> {
    const response = await apiClient.get('/monobank/transactions', { params });
    return response.data;
  },
};

export default apiClient;
