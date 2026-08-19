import {
  Player,
  Subscription,
  Payment,
  AttendanceRecord,
  AcademySettings,
  AdminUser,
  DashboardStats,
  AppNotification
} from '../types';

const API_BASE = '/api';

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('kfa_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

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

  // Subscriptions & Payments
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
  }): Promise<Payment> => {
    return fetchJson(`${API_BASE}/payments`, {
      method: 'POST',
      body: JSON.stringify(data)
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

  // Export URLs
  exportPlayersUrl: '/api/export/players',
  exportPaymentsUrl: '/api/export/payments',
  exportAttendanceUrl: '/api/export/attendance'
};
