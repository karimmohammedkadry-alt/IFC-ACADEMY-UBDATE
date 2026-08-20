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

export type FinancialTransactionType = 'income' | 'expense' | 'salary' | 'withdrawal';

export interface FinancialTransaction {
  id: string;
  type: FinancialTransactionType;
  amount: number;
  date: string;
  description: string;
  category?: string;
  coachName?: string;
  notes?: string;
  userId?: string;
  paymentId?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export interface BackupRecord {
  id: string;
  type: 'daily' | 'weekly' | 'manual';
  startedAt: string;
  completedAt?: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  filename: string;
  googleDriveFileId?: string;
  fileSize?: string;
  error?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  paymentId?: string;
  playerId: string;
  playerName: string;
  membershipCode?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
  description: string;
  academyName: string;
  createdAt: string;
}

export interface SyncQueueItem {
  id: string;
  entity: string;
  entityId: string;
  operation: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  retryCount: number;
  lastAttempt?: string;
  error?: string;
  createdAt: string;
  syncedAt?: string;
}

export interface FinancialOverviewStats {
  totalRevenue: number;
  totalExpenses: number;
  totalSalaries: number;
  netBalance: number;
  paymentsCount: number;
  transactionsCount: number;
}

export interface Coach {
  id: string;
  name: string;
  phone: string;
  assignedGroup: PlayerGroup | 'جميع المجموعات';
  role: string;
  monthlySalary: number;
  joinedDate: string;
  status: 'Active' | 'Inactive';
  notes?: string;
  totalSalariesPaid?: number;
  lastPayoutDate?: string;
}

export interface CoachSalaryPayout {
  id: string;
  coachId: string;
  coachName: string;
  amount: number;
  payoutDate: string;
  notes?: string;
  paymentMethod: PaymentMethod;
}

