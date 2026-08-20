import {
  Player,
  Subscription,
  Payment,
  AttendanceRecord,
  AcademySettings,
  AdminUser,
  DashboardStats,
  AppNotification,
  FinancialTransaction,
  ActivityLog,
  BackupRecord,
  Invoice,
  FinancialOverviewStats
} from '../types';

const API_BASE = '/api';

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('kfa_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options?.headers || {})
      }
    });

    if (!response.ok) {
      let errorMsg = 'حدث خطأ في الاتصال بالخادم';
      try {
        const errData = await response.json();
        if (errData.error) errorMsg = errData.error;
      } catch {
        errorMsg = response.statusText || errorMsg;
      }
      throw new Error(errorMsg);
    }

    return response.json();
  } catch (err: any) {
    if (!navigator.onLine || err.name === 'TypeError' || err.message?.includes('Failed to fetch')) {
      throw new Error('لا يوجد اتصال بالإنترنت أو تعذر الوصول للخادم. يرجى التحقق من الاتصال والمحاولة مرة أخرى.');
    }
    throw err;
  }
}

export const api = {
  // Auth
  login: async (username: string, password: string): Promise<{ token: string; admin: AdminUser }> => {
    return fetchJson(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  getMe: async (): Promise<AdminUser> => {
    return fetchJson(`${API_BASE}/auth/me`);
  },

  updateProfile: async (data: { name: string; email: string; username: string }): Promise<AdminUser> => {
    return fetchJson(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    return fetchJson(`${API_BASE}/auth/password`, {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    return fetchJson(`${API_BASE}/dashboard/stats`);
  },

  // Players
  getPlayers: async (params?: { query?: string; group?: string; status?: string }): Promise<Player[]> => {
    const searchParams = new URLSearchParams();
    if (params?.query) searchParams.append('query', params.query);
    if (params?.group) searchParams.append('group', params.group);
    if (params?.status) searchParams.append('status', params.status);

    const qs = searchParams.toString();
    return fetchJson(`${API_BASE}/players${qs ? `?${qs}` : ''}`);
  },

  getPlayerById: async (id: string): Promise<Player & { subscriptions: Subscription[]; payments: Payment[]; attendance: AttendanceRecord[] }> => {
    return fetchJson(`${API_BASE}/players/${id}`);
  },

  createPlayer: async (data: any): Promise<Player> => {
    return fetchJson(`${API_BASE}/players`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updatePlayer: async (id: string, data: any): Promise<Player> => {
    return fetchJson(`${API_BASE}/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deletePlayer: async (id: string): Promise<{ success: boolean; message: string }> => {
    return fetchJson(`${API_BASE}/players/${id}`, {
      method: 'DELETE'
    });
  },

  // Subscriptions & Renewal
  getSubscriptions: async (params?: { status?: string; query?: string; group?: string }): Promise<Subscription[]> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.query) searchParams.append('query', params.query);
    if (params?.group) searchParams.append('group', params.group);
    const qs = searchParams.toString();
    return fetchJson(`${API_BASE}/subscriptions${qs ? `?${qs}` : ''}`);
  },

  createSubscription: async (data: { playerId: string; planName?: string; value: number; startDate: string; endDate: string }): Promise<Subscription> => {
    return fetchJson(`${API_BASE}/subscriptions`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  renewSubscription: async (data: {
    playerId: string;
    planName?: string;
    value: number;
    startDate: string;
    endDate: string;
    paymentMethod?: string;
    paidBy?: string;
    notes?: string;
    payNow?: boolean;
    idempotencyKey?: string;
  }): Promise<{ subscription: Subscription; payment?: Payment }> => {
    return fetchJson(`${API_BASE}/subscriptions/renew`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: data.idempotencyKey ? { 'X-Idempotency-Key': data.idempotencyKey } : undefined
    });
  },

  // Payments & Invoices
  getPayments: async (params?: { method?: string; status?: string; query?: string; startDate?: string; endDate?: string }): Promise<Payment[]> => {
    const searchParams = new URLSearchParams();
    if (params?.method) searchParams.append('method', params.method);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.query) searchParams.append('query', params.query);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    const qs = searchParams.toString();
    return fetchJson(`${API_BASE}/payments${qs ? `?${qs}` : ''}`);
  },

  recordPayment: async (data: {
    playerId: string;
    subscriptionId?: string;
    amount: number;
    paymentMethod: string;
    paidBy?: 'اللاعب' | 'ولي الأمر' | 'أخرى';
    paymentDate: string;
    notes?: string;
    idempotencyKey?: string;
  }): Promise<Payment> => {
    return fetchJson(`${API_BASE}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: data.idempotencyKey ? { 'X-Idempotency-Key': data.idempotencyKey } : undefined
    });
  },

  getInvoices: async (): Promise<Invoice[]> => {
    return fetchJson(`${API_BASE}/invoices`);
  },

  // Financial & Reports
  getFinancialStats: async (): Promise<FinancialOverviewStats> => {
    return fetchJson(`${API_BASE}/financial/stats`);
  },

  getFinancialTransactions: async (params?: { type?: string; query?: string; startDate?: string; endDate?: string }): Promise<FinancialTransaction[]> => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);
    if (params?.query) searchParams.append('query', params.query);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    const qs = searchParams.toString();
    return fetchJson(`${API_BASE}/financial/transactions${qs ? `?${qs}` : ''}`);
  },

  recordFinancialTransaction: async (data: {
    type: 'income' | 'expense' | 'salary' | 'withdrawal';
    amount: number;
    date: string;
    description: string;
    category?: string;
    coachName?: string;
    notes?: string;
    idempotencyKey?: string;
  }): Promise<FinancialTransaction> => {
    return fetchJson(`${API_BASE}/financial/transactions`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: data.idempotencyKey ? { 'X-Idempotency-Key': data.idempotencyKey } : undefined
    });
  },

  // Attendance
  getAttendance: async (params?: { group?: string; date?: string; playerId?: string; status?: string }): Promise<AttendanceRecord[]> => {
    const searchParams = new URLSearchParams();
    if (params?.group) searchParams.append('group', params.group);
    if (params?.date) searchParams.append('date', params.date);
    if (params?.playerId) searchParams.append('playerId', params.playerId);
    if (params?.status) searchParams.append('status', params.status);
    const qs = searchParams.toString();
    return fetchJson(`${API_BASE}/attendance${qs ? `?${qs}` : ''}`);
  },

  saveBatchAttendance: async (data: { group: string; date: string; records: { playerId: string; status: 'Present' | 'Absent'; notes?: string }[] }): Promise<{ success: boolean; count: number }> => {
    return fetchJson(`${API_BASE}/attendance/batch`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Activity Logs
  getActivityLogs: async (params?: { entityType?: string; action?: string; query?: string; startDate?: string; endDate?: string }): Promise<ActivityLog[]> => {
    const searchParams = new URLSearchParams();
    if (params?.entityType) searchParams.append('entityType', params.entityType);
    if (params?.action) searchParams.append('action', params.action);
    if (params?.query) searchParams.append('query', params.query);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    const qs = searchParams.toString();
    return fetchJson(`${API_BASE}/activity-logs${qs ? `?${qs}` : ''}`);
  },

  // Backups
  getBackups: async (): Promise<BackupRecord[]> => {
    return fetchJson(`${API_BASE}/backups`);
  },

  createManualBackup: async (): Promise<{ success: boolean; message: string; backup: BackupRecord }> => {
    return fetchJson(`${API_BASE}/backups/manual`, {
      method: 'POST'
    });
  },

  // Notifications
  getNotifications: async (): Promise<AppNotification[]> => {
    return fetchJson(`${API_BASE}/notifications`);
  },

  // Settings
  getSettings: async (): Promise<AcademySettings> => {
    return fetchJson(`${API_BASE}/settings`);
  },

  updateSettings: async (data: Partial<AcademySettings>): Promise<AcademySettings> => {
    return fetchJson(`${API_BASE}/settings`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Diagnostics & Supabase Integration
  getDiagnostics: async (): Promise<any> => {
    return fetchJson(`${API_BASE}/diagnostics`);
  },

  getSupabaseStatus: async (): Promise<{ configured: boolean; supabaseUrl: string | null }> => {
    return fetchJson(`${API_BASE}/supabase/status`);
  },

  syncWithSupabase: async (): Promise<{ success: boolean; message: string; results?: Record<string, string> }> => {
    return fetchJson(`${API_BASE}/supabase/sync`, {
      method: 'POST'
    });
  },

  checkSupabaseConnection: async (): Promise<{ ok: boolean; message: string }> => {
    try {
      const diag = await fetchJson<any>(`${API_BASE}/diagnostics`);
      return diag.supabase?.test || { ok: false, message: 'تعذر فحص الاتصال' };
    } catch (e: any) {
      return { ok: false, message: e.message || 'خطأ في الاتصال بالخادم' };
    }
  },

  // Export URLs
  exportPlayersUrl: '/api/export/players',
  exportPaymentsUrl: '/api/export/payments',
  exportAttendanceUrl: '/api/export/attendance',
  exportFinancialUrl: '/api/export/financial',
  exportActivityLogsUrl: '/api/export/activity-logs'
};
