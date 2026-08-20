import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  Player,
  Parent,
  Subscription,
  Payment,
  AttendanceRecord,
  AcademySettings,
  AdminUser,
  AppNotification,
  FinancialTransaction,
  ActivityLog,
  BackupRecord,
  Invoice,
  FinancialOverviewStats,
  Coach
} from '../src/types';
import { getSupabase } from './supabase';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'academy_store.json');

export interface DatabaseSchema {
  admin: AdminUser & { passwordHash: string };
  players: Player[];
  parents: Parent[];
  subscriptions: Subscription[];
  payments: Payment[];
  attendance: AttendanceRecord[];
  coaches: Coach[];
  settings: AcademySettings;
  notifications: AppNotification[];
  financialTransactions: FinancialTransaction[];
  activityLogs: ActivityLog[];
  backups: BackupRecord[];
}

// Initial clean state with bcrypt hashed password by default
const initialData: DatabaseSchema = {
  admin: {
    id: 'admin-1',
    username: 'admin',
    name: 'مدير الأكاديمية (Admin)',
    email: 'admin@ifcacademy.com',
    role: 'Super Admin',
    passwordHash: '$2a$12$e8Y5lqDk9B7eT.z9wG1j6uWk8G0zI/0HqZ9.5R7N4lJvLp8v1S.9a'
  },
  settings: {
    academyName: 'IFC ACADEMY',
    phone: '',
    address: '',
    currency: 'EGP',
    defaultMonthlyFee: 500,
    adminNotifications: true
  },
  players: [],
  parents: [],
  subscriptions: [],
  payments: [],
  attendance: [],
  coaches: [
    {
      id: 'coach-1',
      name: 'كابتن / أحمد حسن',
      phone: '01012345678',
      assignedGroup: 'ناشئين',
      role: 'المدير الفني والمشرف العام',
      monthlySalary: 3500,
      joinedDate: '2025-01-01',
      status: 'Active',
      notes: 'خبرة تدريبية 10 سنوات - رخصة C الأفريقية'
    },
    {
      id: 'coach-2',
      name: 'كابتن / محمود عبد الرازق',
      phone: '01123456789',
      assignedGroup: 'براعم',
      role: 'مدرب مرحلة البراعم الأساسية',
      monthlySalary: 2800,
      joinedDate: '2025-02-01',
      status: 'Active',
      notes: 'متخصص في تطوير المهارات الفردية والأساسيات'
    },
    {
      id: 'coach-3',
      name: 'كابتن / حسام إبراهيم',
      phone: '01234567890',
      assignedGroup: 'شباب',
      role: 'مدرب فني ومعد بدني',
      monthlySalary: 3000,
      joinedDate: '2025-01-15',
      status: 'Active',
      notes: 'مدرب لياقة بدنية وتأهيل'
    }
  ],
  notifications: [],
  financialTransactions: [],
  activityLogs: [],
  backups: []
};

// In-memory runtime cache for fast response and fallback
let memoryCache: DatabaseSchema | null = null;
const memoryIdempotencyStore = new Map<string, { result: any; createdAt: number }>();

function safeAsync(promiseLike: any) {
  Promise.resolve(promiseLike).then(() => {}, () => {});
}

export class AcademyDB {
  private static ensureFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      }
    } catch {
      // Ignore in read-only environment
    }
  }

  public static read(): DatabaseSchema {
    if (memoryCache) {
      return memoryCache;
    }

    this.ensureFile();
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const data: Partial<DatabaseSchema> = JSON.parse(content);
        const safeData: DatabaseSchema = {
          admin: data.admin || initialData.admin,
          settings: { ...initialData.settings, ...(data.settings || {}) },
          players: Array.isArray(data.players) ? data.players : [],
          parents: Array.isArray(data.parents) ? data.parents : [],
          subscriptions: Array.isArray(data.subscriptions) ? data.subscriptions : [],
          payments: Array.isArray(data.payments) ? data.payments : [],
          attendance: Array.isArray(data.attendance) ? data.attendance : [],
          coaches: Array.isArray(data.coaches) && data.coaches.length > 0 ? data.coaches : initialData.coaches,
          notifications: Array.isArray(data.notifications) ? data.notifications : [],
          financialTransactions: Array.isArray(data.financialTransactions) ? data.financialTransactions : [],
          activityLogs: Array.isArray(data.activityLogs) ? data.activityLogs : [],
          backups: Array.isArray(data.backups) ? data.backups : []
        };

        memoryCache = safeData;
        return safeData;
      }
    } catch (e) {
      console.warn('Filesystem read note, using in-memory state', e);
    }

    memoryCache = { ...initialData };
    return memoryCache;
  }

  public static write(data: DatabaseSchema): void {
    memoryCache = data;
    try {
      this.ensureFile();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // In serverless / read-only environment, memoryCache persists during invocation lifetime
    }
  }

  /**
   * Check idempotency in Supabase and fallback to memory
   */
  public static async checkIdempotency(key?: string): Promise<any | null> {
    if (!key) return null;
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('idempotency_keys')
          .select('*')
          .eq('key', key)
          .single();

        if (!error && data) {
          const expiresAt = new Date(data.expiresAt).getTime();
          if (expiresAt > Date.now()) {
            return data.responseBody;
          }
        }
      } catch {
        // Fallback to memory
      }
    }

    const item = memoryIdempotencyStore.get(key);
    if (item && Date.now() - item.createdAt < 24 * 60 * 60 * 1000) {
      return item.result;
    }
    return null;
  }

  /**
   * Save idempotency key to Supabase and memory
   */
  public static async saveIdempotency(key: string, result: any, operation: string = 'transaction', status: number = 200) {
    if (!key) return;
    memoryIdempotencyStore.set(key, { result, createdAt: Date.now() });

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('idempotency_keys').upsert({
          key,
          operation,
          responseStatus: status,
          responseBody: result,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      } catch {
        // Ignore background idempotency sync errors
      }
    }
  }

  /**
   * Enqueue an entity action into the sync_queue table for Google Sheets sync
   */
  public static async enqueueSync(entityType: string, entityId: string, action: string, payload: any) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('sync_queue').insert({
          id: `sync-${uuidv4().slice(0, 8)}`,
          entityType,
          entityId,
          action,
          payload,
          status: 'PENDING'
        });
      } catch {
        // Ignore
      }
    }
  }

  public static logActivity(action: string, entityType: string, description: string, entityId?: string, status: 'SUCCESS' | 'FAILED' | 'PENDING' = 'SUCCESS', userId: string = 'admin-1') {
    const db = this.read();
    const log: ActivityLog = {
      id: `act-${uuidv4().slice(0, 8)}`,
      userId,
      action,
      entityType,
      entityId,
      description,
      status,
      timestamp: new Date().toISOString()
    };
    db.activityLogs.unshift(log);
    // Keep max 500 recent logs
    if (db.activityLogs.length > 500) {
      db.activityLogs = db.activityLogs.slice(0, 500);
    }
    this.write(db);

    // Sync to Supabase in background
    const supabase = getSupabase();
    if (supabase) {
      safeAsync(supabase.from('activity_logs').insert(log));
    }

    return log;
  }

  public static getActivityLogs(filter?: { entityType?: string; action?: string; query?: string; startDate?: string; endDate?: string }): ActivityLog[] {
    const db = this.read();
    let results = [...db.activityLogs];

    if (filter?.entityType && filter.entityType !== 'All' && filter.entityType !== 'الكل') {
      results = results.filter(l => l.entityType === filter.entityType);
    }
    if (filter?.action && filter.action !== 'All' && filter.action !== 'الكل') {
      results = results.filter(l => l.action.toLowerCase().includes(filter.action!.toLowerCase()));
    }
    if (filter?.query && filter.query.trim()) {
      const q = filter.query.trim().toLowerCase();
      results = results.filter(l => l.description.toLowerCase().includes(q) || l.action.toLowerCase().includes(q));
    }
    if (filter?.startDate) {
      results = results.filter(l => l.timestamp >= filter.startDate!);
    }
    if (filter?.endDate) {
      results = results.filter(l => l.timestamp <= filter.endDate!);
    }

    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public static getFinancialStats(): FinancialOverviewStats {
    const db = this.read();
    
    const paymentsTotal = db.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    const otherIncome = db.financialTransactions
      .filter(t => t.type === 'income' && !t.paymentId)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalRevenue = paymentsTotal + otherIncome;

    const totalExpenses = db.financialTransactions
      .filter(t => t.type === 'expense' || t.type === 'withdrawal')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalSalaries = db.financialTransactions
      .filter(t => t.type === 'salary')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const netBalance = totalRevenue - totalExpenses - totalSalaries;

    return {
      totalRevenue,
      totalExpenses,
      totalSalaries,
      netBalance,
      paymentsCount: db.payments.length,
      transactionsCount: db.financialTransactions.length
    };
  }

  public static getFinancialTransactions(filter?: { type?: string; query?: string; startDate?: string; endDate?: string }): FinancialTransaction[] {
    const db = this.read();
    let results = [...db.financialTransactions];

    if (filter?.type && filter.type !== 'All' && filter.type !== 'الكل') {
      results = results.filter(t => t.type === filter.type);
    }
    if (filter?.query && filter.query.trim()) {
      const q = filter.query.trim().toLowerCase();
      results = results.filter(t => 
        t.description.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.coachName && t.coachName.toLowerCase().includes(q))
      );
    }
    if (filter?.startDate) {
      results = results.filter(t => t.date >= filter.startDate!);
    }
    if (filter?.endDate) {
      results = results.filter(t => t.date <= filter.endDate!);
    }

    return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public static createFinancialTransaction(payload: {
    type: 'income' | 'expense' | 'salary' | 'withdrawal';
    amount: number;
    date: string;
    description: string;
    category?: string;
    coachName?: string;
    notes?: string;
    paymentId?: string;
    idempotencyKey?: string;
  }): FinancialTransaction {
    const db = this.read();
    const newTx: FinancialTransaction = {
      id: `tx-${uuidv4().slice(0, 8)}`,
      type: payload.type,
      amount: Number(payload.amount),
      date: payload.date || new Date().toISOString().split('T')[0],
      description: payload.description.trim(),
      category: payload.category?.trim(),
      coachName: payload.coachName?.trim(),
      notes: payload.notes?.trim(),
      paymentId: payload.paymentId,
      createdAt: new Date().toISOString()
    };

    db.financialTransactions.unshift(newTx);
    this.write(db);

    const typeLabels: Record<string, string> = {
      income: 'إيداع مالي',
      expense: 'مصروفات',
      salary: 'راتب مدرب',
      withdrawal: 'سحب مالي'
    };

    this.logActivity(
      `إضافة ${typeLabels[newTx.type] || 'معاملة مالية'}`,
      'Financial',
      `تم تسجيل ${typeLabels[newTx.type] || 'معاملة'} بقيمة ${newTx.amount} ${db.settings.currency || 'EGP'} - ${newTx.description}`,
      newTx.id,
      'SUCCESS'
    );

    // Sync in background to Supabase
    const supabase = getSupabase();
    if (supabase) {
      safeAsync(supabase.from('financial_transactions').insert(newTx));
    }

    this.enqueueSync('FinancialTransaction', newTx.id, 'INSERT', newTx);

    return newTx;
  }

  public static getAdmin() {
    const db = this.read();
    return db.admin;
  }

  public static updateAdmin(updates: Partial<AdminUser>, newPassword?: string) {
    const db = this.read();
    if (updates.name) db.admin.name = updates.name;
    if (updates.email) db.admin.email = updates.email;
    if (updates.username) db.admin.username = updates.username;
    if (newPassword && newPassword.trim().length >= 4) {
      db.admin.passwordHash = newPassword.trim();
    }
    this.write(db);
    const { passwordHash, ...safeAdmin } = db.admin;
    return safeAdmin;
  }

  public static getDashboardStats() {
    const db = this.read();
    const totalPlayers = db.players.length;
    const activePlayers = db.players.filter(p => p.status === 'Active').length;
    const inactivePlayers = db.players.filter(p => p.status === 'Inactive').length;

    const paidSubscriptions = db.subscriptions.filter(s => s.status === 'Paid').length;
    const unpaidSubscriptions = db.subscriptions.filter(s => s.status === 'Unpaid').length;
    
    const today = new Date().toISOString().split('T')[0];
    const attendanceTodayCount = db.attendance.filter(a => a.date === today && a.status === 'Present').length;

    return {
      totalPlayers,
      activePlayers,
      inactivePlayers,
      paidThisMonth: paidSubscriptions,
      unpaidThisMonth: unpaidSubscriptions,
      attendanceTodayCount
    };
  }

  private static calculateSubscriptionStatus(sub: Subscription): Subscription {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const endDate = new Date(sub.endDate);
    endDate.setHours(0, 0, 0, 0);
    const diffTime = endDate.getTime() - todayDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status = sub.status;
    if (diffDays < 0) {
      status = 'Expired';
    } else if (status === 'Paid' && diffDays >= 0 && diffDays <= 3) {
      status = 'ExpiringSoon';
    }

    return {
      ...sub,
      status,
      daysRemaining: diffDays >= 0 ? diffDays : 0
    };
  }

  public static getPlayers(query?: string, group?: string, status?: string): Player[] {
    const db = this.read();
    let result = db.players.map(player => {
      const parent = db.parents.find(p => p.playerId === player.id);
      const playerSubs = db.subscriptions
        .filter(s => s.playerId === player.id)
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      
      const lastPayment = db.payments
        .filter(p => p.playerId === player.id)
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0];

      const rawActiveSubscription = playerSubs[0];
      const activeSubscription = rawActiveSubscription
        ? {
            ...this.calculateSubscriptionStatus(rawActiveSubscription),
            lastPaidBy: lastPayment ? lastPayment.paidBy : (player.group === 'شباب' ? 'اللاعب' : 'ولي الأمر'),
            lastPaymentDate: lastPayment ? lastPayment.paymentDate : undefined
          }
        : undefined;

      return {
        ...player,
        parent,
        activeSubscription
      };
    });

    if (group && group !== 'All' && group !== 'الكل') {
      result = result.filter(p => p.group === group);
    }

    if (status && status !== 'All' && status !== 'الكل') {
      result = result.filter(p => p.status === status);
    }

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(p => 
        p.fullName.toLowerCase().includes(q) ||
        p.membershipCode.toLowerCase().includes(q) ||
        (p.nationalId && p.nationalId.includes(q)) ||
        p.phone.includes(q) ||
        (p.parent && (p.parent.parentName.toLowerCase().includes(q) || p.parent.parentPhone.includes(q)))
      );
    }

    return result;
  }

  public static getPlayerById(id: string) {
    const db = this.read();
    const player = db.players.find(p => p.id === id);
    if (!player) return null;

    const parent = db.parents.find(p => p.playerId === id);
    const subscriptions = db.subscriptions
      .filter(s => s.playerId === id)
      .map(s => this.calculateSubscriptionStatus(s))
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    const payments = db.payments
      .filter(p => p.playerId === id)
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    const attendance = db.attendance
      .filter(a => a.playerId === id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const activeSubscription = subscriptions[0] || null;

    return {
      ...player,
      parent,
      activeSubscription,
      subscriptions,
      payments,
      attendance
    };
  }

  public static createPlayer(payload: {
    fullName: string;
    nationalId?: string;
    membershipCode?: string;
    phone: string;
    birthDate: string;
    age: number;
    group: 'براعم' | 'ناشئين' | 'شباب';
    status: 'Active' | 'Inactive';
    notes?: string;
    initialSubscriptionAmount?: number;
    parent?: {
      parentName: string;
      parentPhone: string;
      relationship: string;
      emergencyPhone: string;
    };
  }) {
    const db = this.read();
    const newId = `p-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`;
    
    let code = payload.membershipCode;
    if (!code || !code.trim()) {
      const count = db.players.length + 1001;
      code = `IFC-${count}`;
    }

    const newPlayer: Player = {
      id: newId,
      membershipCode: code.toUpperCase(),
      fullName: payload.fullName.trim(),
      nationalId: payload.nationalId ? payload.nationalId.trim() : undefined,
      phone: payload.phone.trim(),
      birthDate: payload.birthDate,
      age: Number(payload.age) || 10,
      group: payload.group,
      status: payload.status || 'Active',
      notes: payload.notes || '',
      createdAt: new Date().toISOString()
    };

    db.players.unshift(newPlayer);

    let parentRecord: Parent | undefined;
    if ((payload.group === 'براعم' || payload.group === 'ناشئين') && payload.parent && payload.parent.parentName) {
      parentRecord = {
        id: `par-${uuidv4().slice(0, 8)}`,
        playerId: newId,
        parentName: payload.parent.parentName.trim(),
        parentPhone: payload.parent.parentPhone.trim(),
        relationship: payload.parent.relationship || 'ولي الأمر',
        emergencyPhone: payload.parent.emergencyPhone || payload.parent.parentPhone
      };
      db.parents.push(parentRecord);
    }

    const now = new Date();
    const startDate = now.toISOString().split('T')[0];
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endDate = nextMonth.toISOString().split('T')[0];

    const initialSub: Subscription = {
      id: `sub-${uuidv4().slice(0, 8)}`,
      playerId: newId,
      planName: 'اشتراك شهري',
      value: payload.initialSubscriptionAmount || db.settings.defaultMonthlyFee || 500,
      startDate,
      endDate,
      status: 'Unpaid',
      createdAt: new Date().toISOString()
    };

    db.subscriptions.unshift(initialSub);
    this.write(db);

    // Sync to Supabase in background
    const supabase = getSupabase();
    if (supabase) {
      safeAsync(supabase.from('players').insert(newPlayer));
      if (parentRecord) safeAsync(supabase.from('parents').insert(parentRecord));
      safeAsync(supabase.from('subscriptions').insert(initialSub));
    }

    this.enqueueSync('Player', newPlayer.id, 'INSERT', newPlayer);

    return this.getPlayerById(newId);
  }

  public static updatePlayer(id: string, payload: {
    fullName?: string;
    nationalId?: string;
    membershipCode?: string;
    phone?: string;
    birthDate?: string;
    age?: number;
    group?: 'براعم' | 'ناشئين' | 'شباب';
    status?: 'Active' | 'Inactive';
    notes?: string;
    parent?: {
      parentName: string;
      parentPhone: string;
      relationship: string;
      emergencyPhone: string;
    };
  }) {
    const db = this.read();
    const playerIndex = db.players.findIndex(p => p.id === id);
    if (playerIndex === -1) return null;

    const existing = db.players[playerIndex];
    db.players[playerIndex] = {
      ...existing,
      fullName: payload.fullName !== undefined ? payload.fullName.trim() : existing.fullName,
      nationalId: payload.nationalId !== undefined ? payload.nationalId.trim() : existing.nationalId,
      membershipCode: payload.membershipCode !== undefined ? payload.membershipCode.trim().toUpperCase() : existing.membershipCode,
      phone: payload.phone !== undefined ? payload.phone.trim() : existing.phone,
      birthDate: payload.birthDate !== undefined ? payload.birthDate : existing.birthDate,
      age: payload.age !== undefined ? Number(payload.age) : existing.age,
      group: payload.group !== undefined ? payload.group : existing.group,
      status: payload.status !== undefined ? payload.status : existing.status,
      notes: payload.notes !== undefined ? payload.notes : existing.notes
    };

    const targetGroup = payload.group || existing.group;
    if (targetGroup === 'براعم' || targetGroup === 'ناشئين') {
      if (payload.parent) {
        const parentIndex = db.parents.findIndex(p => p.playerId === id);
        if (parentIndex !== -1) {
          db.parents[parentIndex] = {
            ...db.parents[parentIndex],
            parentName: payload.parent.parentName,
            parentPhone: payload.parent.parentPhone,
            relationship: payload.parent.relationship,
            emergencyPhone: payload.parent.emergencyPhone
          };
        } else {
          db.parents.push({
            id: `par-${uuidv4().slice(0, 8)}`,
            playerId: id,
            parentName: payload.parent.parentName,
            parentPhone: payload.parent.parentPhone,
            relationship: payload.parent.relationship,
            emergencyPhone: payload.parent.emergencyPhone
          });
        }
      }
    }

    this.write(db);

    const supabase = getSupabase();
    if (supabase) {
      safeAsync(supabase.from('players').update(db.players[playerIndex]).eq('id', id));
    }

    this.enqueueSync('Player', id, 'UPDATE', db.players[playerIndex]);

    return this.getPlayerById(id);
  }

  public static deletePlayer(id: string) {
    const db = this.read();
    const playerIndex = db.players.findIndex(p => p.id === id);
    if (playerIndex === -1) return false;

    db.players.splice(playerIndex, 1);
    db.parents = db.parents.filter(p => p.playerId !== id);
    db.subscriptions = db.subscriptions.filter(s => s.playerId !== id);
    db.payments = db.payments.filter(p => p.playerId !== id);
    db.attendance = db.attendance.filter(a => a.playerId !== id);
    db.notifications = db.notifications.filter(n => n.playerId !== id);

    this.write(db);

    const supabase = getSupabase();
    if (supabase) {
      safeAsync(supabase.from('players').delete().eq('id', id));
    }

    this.enqueueSync('Player', id, 'DELETE', { id });

    return true;
  }

  public static getSubscriptions(filter?: { status?: string; query?: string; group?: string }) {
    const db = this.read();
    
    const playerLatestMap = new Map<string, Subscription>();
    const sortedSubs = [...db.subscriptions].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    for (const sub of sortedSubs) {
      if (!playerLatestMap.has(sub.playerId)) {
        playerLatestMap.set(sub.playerId, sub);
      }
    }

    let results = Array.from(playerLatestMap.values()).map(sub => {
      const calculated = this.calculateSubscriptionStatus(sub);
      const player = db.players.find(p => p.id === calculated.playerId);
      const lastPay = db.payments
        .filter(p => p.playerId === calculated.playerId)
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0];

      return {
        ...calculated,
        playerName: player ? player.fullName : 'لاعب محذوف',
        membershipCode: player ? player.membershipCode : '',
        nationalId: player ? player.nationalId : undefined,
        group: player ? player.group : undefined,
        lastPaidBy: lastPay ? lastPay.paidBy : (player?.group === 'شباب' ? 'اللاعب' : 'ولي الأمر')
      };
    });

    if (filter?.status && filter.status !== 'All' && filter.status !== 'الكل') {
      results = results.filter(s => s.status === filter.status);
    }

    if (filter?.group && filter.group !== 'All' && filter.group !== 'الكل') {
      results = results.filter(s => s.group === filter.group);
    }

    if (filter?.query && filter.query.trim()) {
      const q = filter.query.trim().toLowerCase();
      results = results.filter(s => 
        (s.playerName && s.playerName.toLowerCase().includes(q)) ||
        (s.membershipCode && s.membershipCode.toLowerCase().includes(q)) ||
        (s.nationalId && s.nationalId.includes(q))
      );
    }

    return results;
  }

  public static createSubscription(payload: {
    playerId: string;
    planName?: string;
    value: number;
    startDate: string;
    endDate: string;
  }) {
    const db = this.read();
    const newSub: Subscription = {
      id: `sub-${uuidv4().slice(0, 8)}`,
      playerId: payload.playerId,
      planName: payload.planName || 'اشتراك شهري',
      value: Number(payload.value),
      startDate: payload.startDate,
      endDate: payload.endDate,
      status: 'Unpaid',
      createdAt: new Date().toISOString()
    };

    db.subscriptions.unshift(newSub);
    this.write(db);

    const supabase = getSupabase();
    if (supabase) {
      safeAsync(supabase.from('subscriptions').insert(newSub));
    }

    this.enqueueSync('Subscription', newSub.id, 'INSERT', newSub);

    return newSub;
  }

  public static getPayments(filter?: {
    method?: string;
    status?: string;
    query?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const db = this.read();
    let results = db.payments.map(pay => {
      const player = db.players.find(p => p.id === pay.playerId);
      return {
        ...pay,
        playerName: player ? player.fullName : 'لاعب محذوف',
        membershipCode: player ? player.membershipCode : '',
        paidBy: pay.paidBy || 'ولي الأمر'
      };
    });

    if (filter?.method && filter.method !== 'All' && filter.method !== 'الكل') {
      results = results.filter(p => p.paymentMethod === filter.method);
    }

    if (filter?.query && filter.query.trim()) {
      const q = filter.query.trim().toLowerCase();
      results = results.filter(p => 
        (p.playerName && p.playerName.toLowerCase().includes(q)) ||
        (p.membershipCode && p.membershipCode.toLowerCase().includes(q)) ||
        p.receiptNumber.toLowerCase().includes(q)
      );
    }

    if (filter?.startDate) {
      results = results.filter(p => p.paymentDate >= filter.startDate!);
    }

    if (filter?.endDate) {
      results = results.filter(p => p.paymentDate <= filter.endDate!);
    }

    return results.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }

  public static recordPayment(payload: {
    playerId: string;
    subscriptionId?: string;
    amount: number;
    paymentMethod: 'Cash' | 'Wallet' | 'InstaPay';
    paidBy?: 'اللاعب' | 'ولي الأمر' | 'أخرى';
    paymentDate: string;
    notes?: string;
    idempotencyKey?: string;
  }) {
    const db = this.read();
    const player = db.players.find(p => p.id === payload.playerId);
    if (!player) throw new Error('Player not found');

    let targetSub: Subscription | undefined;
    if (payload.subscriptionId) {
      targetSub = db.subscriptions.find(s => s.id === payload.subscriptionId);
    } else {
      targetSub = db.subscriptions
        .filter(s => s.playerId === payload.playerId)
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
    }

    const receiptNum = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPayment: Payment = {
      id: `pay-${uuidv4().slice(0, 8)}`,
      playerId: payload.playerId,
      subscriptionId: targetSub ? targetSub.id : undefined,
      amount: Number(payload.amount),
      paymentMethod: payload.paymentMethod,
      paidBy: payload.paidBy || (player.group === 'شباب' ? 'اللاعب' : 'ولي الأمر'),
      paymentDate: payload.paymentDate || new Date().toISOString().split('T')[0],
      status: 'Paid',
      receiptNumber: receiptNum,
      notes: payload.notes || '',
      createdAt: new Date().toISOString()
    };

    db.payments.unshift(newPayment);

    if (targetSub) {
      targetSub.status = 'Paid';
      targetSub.lastPaymentDate = newPayment.paymentDate;
    }

    // Auto-create linked financial transaction for income
    const financialTx: FinancialTransaction = {
      id: `tx-${uuidv4().slice(0, 8)}`,
      type: 'income',
      amount: Number(payload.amount),
      date: newPayment.paymentDate,
      description: `سداد اشتراك - اللاعب ${player.fullName} (${player.membershipCode})`,
      category: 'اشتراكات شهرية',
      notes: payload.notes || `إيصال رقم ${receiptNum}`,
      paymentId: newPayment.id,
      createdAt: new Date().toISOString()
    };
    db.financialTransactions.unshift(financialTx);

    this.write(db);

    this.logActivity(
      'سداد اشتراك',
      'Payment',
      `تم استلام دفعة بقيمة ${newPayment.amount} ${db.settings.currency || 'EGP'} للاعب ${player.fullName} (${player.membershipCode}) بإيصال ${receiptNum}`,
      newPayment.id,
      'SUCCESS'
    );

    const supabase = getSupabase();
    if (supabase) {
      safeAsync(supabase.from('payments').insert(newPayment));
      if (targetSub) safeAsync(supabase.from('subscriptions').update({ status: 'Paid', lastPaymentDate: newPayment.paymentDate }).eq('id', targetSub.id));
      safeAsync(supabase.from('financial_transactions').insert(financialTx));
    }

    this.enqueueSync('Payment', newPayment.id, 'INSERT', newPayment);

    const fullPayment = {
      ...newPayment,
      playerName: player.fullName,
      membershipCode: player.membershipCode
    };

    return fullPayment;
  }

  public static renewSubscription(payload: {
    playerId: string;
    planName?: string;
    value: number;
    startDate: string;
    endDate: string;
    paymentMethod?: 'Cash' | 'Wallet' | 'InstaPay';
    paidBy?: 'اللاعب' | 'ولي الأمر' | 'أخرى';
    notes?: string;
    payNow?: boolean;
    idempotencyKey?: string;
  }) {
    const db = this.read();
    const player = db.players.find(p => p.id === payload.playerId);
    if (!player) throw new Error('Player not found');

    const newSub: Subscription = {
      id: `sub-${uuidv4().slice(0, 8)}`,
      playerId: payload.playerId,
      planName: payload.planName || 'تجديد اشتراك شهري',
      value: Number(payload.value),
      startDate: payload.startDate,
      endDate: payload.endDate,
      status: payload.payNow ? 'Paid' : 'Unpaid',
      createdAt: new Date().toISOString()
    };

    db.subscriptions.unshift(newSub);

    let paymentRecord: Payment | undefined;
    let financialTx: FinancialTransaction | undefined;

    if (payload.payNow) {
      const receiptNum = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      paymentRecord = {
        id: `pay-${uuidv4().slice(0, 8)}`,
        playerId: payload.playerId,
        subscriptionId: newSub.id,
        amount: Number(payload.value),
        paymentMethod: payload.paymentMethod || 'Cash',
        paidBy: payload.paidBy || (player.group === 'شباب' ? 'اللاعب' : 'ولي الأمر'),
        paymentDate: payload.startDate || new Date().toISOString().split('T')[0],
        status: 'Paid',
        receiptNumber: receiptNum,
        notes: payload.notes || 'تجديد اشتراك ودفع مباشر',
        createdAt: new Date().toISOString()
      };
      db.payments.unshift(paymentRecord);
      newSub.lastPaymentDate = paymentRecord.paymentDate;

      financialTx = {
        id: `tx-${uuidv4().slice(0, 8)}`,
        type: 'income',
        amount: Number(payload.value),
        date: paymentRecord.paymentDate,
        description: `تجديد وسداد اشتراك - اللاعب ${player.fullName} (${player.membershipCode})`,
        category: 'اشتراكات شهرية',
        notes: payload.notes || `إيصال رقم ${receiptNum}`,
        paymentId: paymentRecord.id,
        createdAt: new Date().toISOString()
      };
      db.financialTransactions.unshift(financialTx);
    }

    this.write(db);

    this.logActivity(
      'تجديد اشتراك',
      'Subscription',
      `تم تجديد اشتراك اللاعب ${player.fullName} (${player.membershipCode}) للفترة من ${newSub.startDate} إلى ${newSub.endDate} ${payload.payNow ? 'مع السداد' : 'بدون سداد'}`,
      newSub.id,
      'SUCCESS'
    );

    const supabase = getSupabase();
    if (supabase) {
      safeAsync(supabase.from('subscriptions').insert(newSub));
      if (paymentRecord) safeAsync(supabase.from('payments').insert(paymentRecord));
      if (financialTx) safeAsync(supabase.from('financial_transactions').insert(financialTx));
    }

    this.enqueueSync('Subscription', newSub.id, 'INSERT', newSub);
    if (paymentRecord) this.enqueueSync('Payment', paymentRecord.id, 'INSERT', paymentRecord);

    const result = {
      subscription: this.calculateSubscriptionStatus(newSub),
      payment: paymentRecord
    };

    return result;
  }

  public static getInvoices(filter?: { query?: string; startDate?: string; endDate?: string }): Invoice[] {
    const db = this.read();
    const settings = db.settings;
    
    return db.payments.map(p => {
      const player = db.players.find(pl => pl.id === p.playerId);
      return {
        id: `inv-${p.id}`,
        invoiceNumber: p.receiptNumber || `INV-${p.id.slice(-6).toUpperCase()}`,
        paymentId: p.id,
        playerId: p.playerId,
        playerName: player ? player.fullName : 'لاعب',
        membershipCode: player?.membershipCode,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        date: p.paymentDate,
        description: p.notes || `سداد اشتراك أكاديمية ${settings.academyName}`,
        academyName: settings.academyName,
        createdAt: p.createdAt
      };
    });
  }

  public static getBackups(): BackupRecord[] {
    const db = this.read();
    return db.backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static createBackupRecord(type: 'daily' | 'weekly' | 'manual' = 'manual', googleDriveFileId?: string, fileSize?: string): BackupRecord {
    const db = this.read();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `IFC-Academy-${type === 'daily' ? 'Daily' : type === 'weekly' ? 'Weekly' : 'Manual'}-${dateStr}-${Date.now().toString().slice(-4)}.xlsx`;

    const backup: BackupRecord = {
      id: `bk-${uuidv4().slice(0, 8)}`,
      type,
      startedAt: now.toISOString(),
      completedAt: new Date().toISOString(),
      status: 'SUCCESS',
      filename,
      googleDriveFileId: googleDriveFileId || `gdrive-${uuidv4().slice(0, 12)}`,
      fileSize: fileSize || `${Math.round(JSON.stringify(db).length / 1024 + 12)} KB`,
      createdAt: now.toISOString()
    };

    db.backups.unshift(backup);
    if (db.backups.length > 50) {
      db.backups = db.backups.slice(0, 50);
    }
    this.write(db);

    this.logActivity(
      'إنشاء نسخة احتياطية',
      'Backup',
      `تم إنشاء نسخة احتياطية بنجاح باسم ${filename}`,
      backup.id,
      'SUCCESS'
    );

    const supabase = getSupabase();
    if (supabase) {
      safeAsync(supabase.from('backups').insert(backup));
    }

    return backup;
  }

  public static getAttendance(filter?: {
    group?: string;
    date?: string;
    playerId?: string;
    status?: string;
    query?: string;
  }) {
    const db = this.read();
    let results = db.attendance.map(att => {
      const player = db.players.find(p => p.id === att.playerId);
      return {
        ...att,
        playerName: player ? player.fullName : 'لاعب محذوف',
        membershipCode: player ? player.membershipCode : ''
      };
    });

    if (filter?.group && filter.group !== 'All' && filter.group !== 'الكل') {
      results = results.filter(a => a.group === filter.group);
    }

    if (filter?.date) {
      results = results.filter(a => a.date === filter.date);
    }

    if (filter?.playerId) {
      results = results.filter(a => a.playerId === filter.playerId);
    }

    if (filter?.status && filter.status !== 'All' && filter.status !== 'الكل') {
      results = results.filter(a => a.status === filter.status);
    }

    if (filter?.query && filter.query.trim()) {
      const q = filter.query.trim().toLowerCase();
      results = results.filter(a =>
        (a.playerName && a.playerName.toLowerCase().includes(q)) ||
        (a.membershipCode && a.membershipCode.toLowerCase().includes(q)) ||
        (a.notes && a.notes.toLowerCase().includes(q))
      );
    }

    return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public static saveBatchAttendance(payload: {
    group: 'براعم' | 'ناشئين' | 'شباب';
    date: string;
    records: { playerId: string; status: 'Present' | 'Absent'; notes?: string }[];
  }) {
    const db = this.read();
    const date = payload.date;
    const group = payload.group;

    const savedRecords: AttendanceRecord[] = [];

    for (const item of payload.records) {
      const existingIdx = db.attendance.findIndex(
        a => a.playerId === item.playerId && a.date === date
      );

      if (existingIdx !== -1) {
        db.attendance[existingIdx].status = item.status;
        db.attendance[existingIdx].group = group;
        if (item.notes !== undefined) {
          db.attendance[existingIdx].notes = item.notes;
        }
        db.attendance[existingIdx].markedAt = new Date().toISOString();
        savedRecords.push(db.attendance[existingIdx]);
      } else {
        const newAtt: AttendanceRecord = {
          id: `att-${uuidv4().slice(0, 8)}`,
          playerId: item.playerId,
          group,
          date,
          status: item.status,
          notes: item.notes || '',
          markedAt: new Date().toISOString()
        };
        db.attendance.unshift(newAtt);
        savedRecords.push(newAtt);
      }
    }

    this.write(db);

    const supabase = getSupabase();
    if (supabase && savedRecords.length > 0) {
      safeAsync(supabase.from('attendance').upsert(savedRecords));
    }

    return { success: true, count: payload.records.length };
  }

  public static getNotifications(): AppNotification[] {
    try {
      const db = this.read();
      const liveNotifs: AppNotification[] = [];
      const players = db.players || [];
      const subscriptions = db.subscriptions || [];
      const dbNotifs = db.notifications || [];
      const currency = db.settings?.currency || 'EGP';

      for (const player of players) {
        if (!player || player.status !== 'Active') continue;
        const playerSubs = subscriptions
          .filter(s => s && s.playerId === player.id)
          .sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime());
        
        const rawSub = playerSubs[0];

        if (rawSub) {
          const sub = this.calculateSubscriptionStatus(rawSub);
          const memCode = player.membershipCode || '';
          if (sub.status === 'Expired') {
            liveNotifs.push({
              id: `exp-${player.id}`,
              type: 'expired',
              title: 'اشتراك منتهي',
              message: `اشتراك اللاعب ${player.fullName} (${memCode}) منتهي بتاريخ ${sub.endDate}`,
              playerId: player.id,
              date: sub.endDate,
              read: false
            });
          } else if (sub.status === 'ExpiringSoon') {
            liveNotifs.push({
              id: `soon-${player.id}`,
              type: 'expiring_soon',
              title: 'تنبيه: اشتراك يوشك على الانتهاء',
              message: `اشتراك اللاعب ${player.fullName} (${memCode}) ينتهي خلال ${sub.daysRemaining} أيام (${sub.endDate})`,
              playerId: player.id,
              date: sub.endDate,
              read: false
            });
          } else if (sub.status === 'Unpaid') {
            liveNotifs.push({
              id: `unp-${player.id}`,
              type: 'unpaid',
              title: 'اشتراك غير مسدد',
              message: `اللاعب ${player.fullName} (${memCode}) لم يسدد اشتراك الشهر بقيمة ${sub.value || 500} ${currency}`,
              playerId: player.id,
              date: sub.startDate,
              read: false
            });
          }
        }
      }

      const combined = [...liveNotifs, ...dbNotifs];
      const seen = new Set();
      return combined.filter(n => {
        if (!n) return false;
        const key = `${n.type}-${n.playerId || n.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch (err) {
      console.error('Error generating notifications', err);
      return [];
    }
  }

  public static getSettings() {
    const db = this.read();
    return db.settings;
  }

  public static updateSettings(settings: Partial<AcademySettings>) {
    const db = this.read();
    db.settings = {
      ...db.settings,
      ...settings
    };
    this.write(db);

    const supabase = getSupabase();
    if (supabase) {
      safeAsync(supabase.from('settings').upsert({ id: 'academy_settings', ...db.settings }));
    }

    return db.settings;
  }

  // ==================== COACHES MANAGEMENT ====================
  public static getCoaches(filter?: { group?: string; status?: string; query?: string }): Coach[] {
    const db = this.read();
    let coaches = [...(db.coaches || [])];

    // Compute total salaries paid to each coach from financial transactions
    const salaryTx = db.financialTransactions.filter(t => t.type === 'salary');

    coaches = coaches.map(c => {
      const coachPayouts = salaryTx.filter(
        t => (t.coachName && t.coachName.toLowerCase().includes(c.name.toLowerCase())) ||
             (t.description && t.description.toLowerCase().includes(c.name.toLowerCase()))
      );
      const totalPaid = coachPayouts.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const sorted = [...coachPayouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastPayout = sorted.length > 0 ? sorted[0].date : undefined;

      return {
        ...c,
        totalSalariesPaid: totalPaid,
        lastPayoutDate: lastPayout
      };
    });

    if (filter?.group && filter.group !== 'All' && filter.group !== 'الكل') {
      coaches = coaches.filter(c => c.assignedGroup === filter.group || c.assignedGroup === 'جميع المجموعات');
    }

    if (filter?.status && filter.status !== 'All' && filter.status !== 'الكل') {
      coaches = coaches.filter(c => c.status === filter.status);
    }

    if (filter?.query && filter.query.trim()) {
      const q = filter.query.trim().toLowerCase();
      coaches = coaches.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q)
      );
    }

    return coaches;
  }

  public static createCoach(payload: {
    name: string;
    phone: string;
    assignedGroup: any;
    role: string;
    monthlySalary: number;
    joinedDate?: string;
    status?: 'Active' | 'Inactive';
    notes?: string;
  }): Coach {
    const db = this.read();
    if (!db.coaches) db.coaches = [];

    const newCoach: Coach = {
      id: `coach-${uuidv4().slice(0, 8)}`,
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      assignedGroup: payload.assignedGroup || 'ناشئين',
      role: payload.role.trim() || 'مدرب فني',
      monthlySalary: Number(payload.monthlySalary) || 3000,
      joinedDate: payload.joinedDate || new Date().toISOString().split('T')[0],
      status: payload.status || 'Active',
      notes: payload.notes?.trim() || ''
    };

    db.coaches.unshift(newCoach);
    this.write(db);

    this.logActivity(
      'إضافة مدرب جديد',
      'Coach',
      `تم إضافة المدرب ${newCoach.name} (${newCoach.role}) لمجموعة ${newCoach.assignedGroup}`,
      newCoach.id,
      'SUCCESS'
    );

    return newCoach;
  }

  public static updateCoach(id: string, payload: Partial<Coach>): Coach {
    const db = this.read();
    const index = (db.coaches || []).findIndex(c => c.id === id);
    if (index === -1) throw new Error('المدرب غير موجود');

    db.coaches[index] = {
      ...db.coaches[index],
      ...payload
    };

    this.write(db);

    this.logActivity(
      'تعديل بيانات مدرب',
      'Coach',
      `تم تحديث بيانات المدرب ${db.coaches[index].name}`,
      id,
      'SUCCESS'
    );

    return db.coaches[index];
  }

  public static deleteCoach(id: string): boolean {
    const db = this.read();
    const coach = (db.coaches || []).find(c => c.id === id);
    if (!coach) throw new Error('المدرب غير موجود');

    db.coaches = (db.coaches || []).filter(c => c.id !== id);
    this.write(db);

    this.logActivity(
      'حذف مدرب',
      'Coach',
      `تم حذف المدرب ${coach.name} من سجلات الأكاديمية`,
      id,
      'SUCCESS'
    );

    return true;
  }

  public static payCoachSalary(payload: {
    coachId: string;
    amount: number;
    payoutDate: string;
    paymentMethod: 'Cash' | 'Wallet' | 'InstaPay';
    notes?: string;
    idempotencyKey?: string;
  }): FinancialTransaction {
    const db = this.read();
    const coach = (db.coaches || []).find(c => c.id === payload.coachId);
    if (!coach) throw new Error('المدرب غير موجود');

    const tx: FinancialTransaction = {
      id: `tx-${uuidv4().slice(0, 8)}`,
      type: 'salary',
      amount: Number(payload.amount),
      date: payload.payoutDate || new Date().toISOString().split('T')[0],
      description: `صرف راتب شهري - ${coach.name} (${coach.role})`,
      category: 'رواتب مدربين',
      coachName: coach.name,
      notes: payload.notes ? `${payload.notes} | طريقة الدفع: ${payload.paymentMethod}` : `طريقة الدفع: ${payload.paymentMethod}`,
      createdAt: new Date().toISOString()
    };

    db.financialTransactions.unshift(tx);
    this.write(db);

    this.logActivity(
      'صرف راتب مدرب',
      'Financial',
      `تم صرف راتب للمدرب ${coach.name} بقيمة ${payload.amount} EGP بطريقة (${payload.paymentMethod})`,
      tx.id,
      'SUCCESS'
    );

    const supabase = getSupabase();
    if (supabase) {
      safeAsync(supabase.from('financial_transactions').insert(tx));
    }

    return tx;
  }
}
