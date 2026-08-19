export type PlayerGroup = 'براعم' | 'ناشئين' | 'شباب';
export type PlayerStatus = 'Active' | 'Inactive';
export type SubscriptionStatus = 'Paid' | 'Unpaid' | 'Expired' | 'ExpiringSoon';
export type PaymentMethod = 'Cash' | 'Wallet' | 'InstaPay';
export type AttendanceStatus = 'Present' | 'Absent';
export type PaidByType = 'اللاعب' | 'ولي الأمر' | 'أخرى';

export interface Parent {
  id?: string;
  playerId: string;
  parentName: string;
  parentPhone: string;
  relationship: string;
  emergencyPhone: string;
}

export interface Player {
  id: string;
  membershipCode: string;
  nationalId?: string; // الرقم القومي
  fullName: string;
  phone: string;
  birthDate: string;
  age: number;
  group: PlayerGroup;
  status: PlayerStatus;
  notes?: string;
  createdAt: string;
  parent?: Parent;
  activeSubscription?: Subscription;
}

export interface Subscription {
  id: string;
  playerId: string;
  playerName?: string;
  membershipCode?: string;
  group?: PlayerGroup;
  planName: string;
  value: number;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  daysRemaining?: number; // الأيام المتبقية على انتهاء الاشتراك
  lastPaymentDate?: string;
  lastPaidBy?: PaidByType | string;
  createdAt: string;
}

export interface Payment {
  id: string;
  playerId: string;
  playerName?: string;
  membershipCode?: string;
  subscriptionId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paidBy?: PaidByType | string; // من قام بالدفع (اللاعب / ولي الأمر)
  paymentDate: string;
  status: 'Paid';
  notes?: string;
  receiptNumber: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  playerId: string;
  playerName?: string;
  membershipCode?: string;
  group: PlayerGroup;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
  markedAt: string;
}

export interface AcademySettings {
  academyName: string;
  phone: string;
  address: string;
  currency: string;
  defaultMonthlyFee: number;
  adminNotifications: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
}

export interface DashboardStats {
  totalPlayers: number;
  activePlayers: number;
  inactivePlayers: number;
  paidThisMonth: number;
  unpaidThisMonth: number;
  attendanceTodayCount: number;
}

export interface AppNotification {
  id: string;
  type: 'expired' | 'expiring_soon' | 'unpaid' | 'info';
  title: string;
  message: string;
  playerId?: string;
  date: string;
  read: boolean;
}
