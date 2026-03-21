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

export interface CategoryTransaction {
  id: string;
  time: string;
  description: string;
  /** Signed amount in currency units: negative = expense, positive = refund */
  amount: number;
  mcc: number | null;
}

export interface IncomeItem {
  id: string;
  source: string;
  amount: number;
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

export interface SyncJob {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentAccount: number;
  totalAccounts: number;
  transactionsCount: number;
  message: string;
  error?: string;
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

  async syncTransactions(): Promise<{ jobId: string }> {
    const response = await apiClient.post<{ jobId: string }>('/monobank/sync');

    return response.data;
  },

  async getSyncStatus(jobId: string): Promise<SyncJob> {
    const response = await apiClient.get<SyncJob>(`/monobank/sync/status/${jobId}`);

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

export const incomeApi = {
  async getAll(): Promise<IncomeItem[]> {
    const response = await apiClient.get<IncomeItem[]>('/income');

    return response.data;
  },

  async create(data: Omit<IncomeItem, 'id'>): Promise<IncomeItem> {
    const response = await apiClient.post<IncomeItem>('/income', data);

    return response.data;
  },

  async update(id: string, data: Partial<Omit<IncomeItem, 'id'>>): Promise<IncomeItem> {
    const response = await apiClient.patch<IncomeItem>(`/income/${id}`, data);

    return response.data;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(`/income/${id}`);

    return response.data;
  },
};

export const categoriesApi = {
  async getAll(params?: { from?: string; to?: string }): Promise<Category[]> {
    const response = await apiClient.get<Category[]>('/categories', { params });

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

  async getTransactions(
    id: string,
    params?: { from?: string; to?: string },
  ): Promise<CategoryTransaction[]> {
    const response = await apiClient.get<CategoryTransaction[]>(
      `/categories/${id}/transactions`,
      { params },
    );

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
