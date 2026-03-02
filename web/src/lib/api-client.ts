import axios from 'axios';
import type { API } from '@financial-app/common-types';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';

    return Promise.reject(new Error(message));
  }
);

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  budget: number;
  spent: number;
}

export interface TransactionCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  monobankId: string;
  time: string;
  description: string;
  amount: number;
  balance: number;
  currency: number;
  mcc: number | null;
  originalMcc: number | null;
  hold: boolean;
  commissionRate: number;
  cashbackAmount: number;
  categoryId: string | null;
  category: TransactionCategory | null;
  account: { id: string; type: string };
}

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

  async setupWebhook(): Promise<{ success: boolean; webhookUrl: string }> {
    const response = await apiClient.post('/monobank/webhook/setup');

    return response.data;
  },

  async getTransactions(params?: { page?: number; limit?: number }): Promise<any> {
    const response = await apiClient.get('/monobank/transactions', { params });

    return response.data;
  },
};

export const categoriesApi = {
  async getAll(): Promise<Category[]> {
    const response = await apiClient.get<Category[]>('/categories');

    return response.data;
  },

  async create(data: Omit<Category, 'id' | 'spent'>): Promise<Category> {
    const response = await apiClient.post<Category>('/categories', data);

    return response.data;
  },

  async update(id: string, data: Partial<Omit<Category, 'id' | 'spent'>>): Promise<Category> {
    const response = await apiClient.patch<Category>(`/categories/${id}`, data);

    return response.data;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(`/categories/${id}`);

    return response.data;
  },
};

export const transactionsApi = {
  async create(data: {
    description: string;
    amount: number;
    time: string;
    categoryId?: string;
    currency?: number;
  }): Promise<Transaction> {
    const response = await apiClient.post<Transaction>('/transactions', data);

    return response.data;
  },

  async update(
    id: string,
    data: {
      description?: string;
      amount?: number;
      time?: string;
      categoryId?: string | null;
    }
  ): Promise<Transaction> {
    const response = await apiClient.patch<Transaction>(`/transactions/${id}`, data);

    return response.data;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(`/transactions/${id}`);

    return response.data;
  },
};

export default apiClient;
