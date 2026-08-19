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
  AppNotification
} from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'academy_store.json');

export interface DatabaseSchema {
  admin: AdminUser & { passwordHash: string };
  players: Player[];
  parents: Parent[];
  subscriptions: Subscription[];
  payments: Payment[];
  attendance: AttendanceRecord[];
  settings: AcademySettings;
  notifications: AppNotification[];
}

// Initial clean data
const initialData: DatabaseSchema = {
  admin: {
    id: 'admin-1',
    username: 'admin',
    name: 'مدير الأكاديمية (Admin)',
    email: 'admin@ifcacademy.com',
    role: 'Super Admin',
    passwordHash: '5555'
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
  notifications: []
};

export class AcademyDB {
  private static ensureFile() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    }
  }

  public static read(): DatabaseSchema {
    this.ensureFile();
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const data: DatabaseSchema = JSON.parse(content);
      // Ensure admin password is 5555 if legacy
      if (data.admin && data.admin.passwordHash === 'admin123') {
        data.admin.passwordHash = '5555';
        data.admin.username = 'admin';
        this.write(data);
      }
      return data;
    } catch (e) {
      console.error('Error reading database file, returning initial data', e);
      return initialData;
    }
  }

  public static write(data: DatabaseSchema): void {
    this.ensureFile();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
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

    if ((payload.group === 'براعم' || payload.group === 'ناشئين') && payload.parent && payload.parent.parentName) {
      const parentRecord: Parent = {
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
    return true;
  }

  public static getSubscriptions(filter?: { status?: string; query?: string; group?: string }) {
    const db = this.read();
    
    // Get unique latest subscription for each active player
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

    this.write(db);
    return newPayment;
  }

  public static getAttendance(filter?: {
    group?: string;
    date?: string;
    playerId?: string;
    status?: string;
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
      } else {
        db.attendance.unshift({
          id: `att-${uuidv4().slice(0, 8)}`,
          playerId: item.playerId,
          group,
          date,
          status: item.status,
          notes: item.notes || '',
          markedAt: new Date().toISOString()
        });
      }
    }

    this.write(db);
    return { success: true, count: payload.records.length };
  }

  public static getNotifications(): AppNotification[] {
    const db = this.read();
    const today = new Date().toISOString().split('T')[0];
    const liveNotifs: AppNotification[] = [];

    for (const player of db.players) {
      if (player.status !== 'Active') continue;
      const rawSub = db.subscriptions
        .filter(s => s.playerId === player.id)
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];

      if (rawSub) {
        const sub = this.calculateSubscriptionStatus(rawSub);
        if (sub.status === 'Expired') {
          liveNotifs.push({
            id: `exp-${player.id}`,
            type: 'expired',
            title: 'اشتراك منتهي',
            message: `اشتراك اللاعب ${player.fullName} (${player.membershipCode}) منتهي بتاريخ ${sub.endDate}`,
            playerId: player.id,
            date: sub.endDate,
            read: false
          });
        } else if (sub.status === 'ExpiringSoon') {
          liveNotifs.push({
            id: `soon-${player.id}`,
            type: 'expiring_soon',
            title: 'تنبيه: اشتراك يوشك على الانتهاء',
            message: `اشتراك اللاعب ${player.fullName} (${player.membershipCode}) ينتهي خلال ${sub.daysRemaining} أيام (${sub.endDate})`,
            playerId: player.id,
            date: sub.endDate,
            read: false
          });
        } else if (sub.status === 'Unpaid') {
          liveNotifs.push({
            id: `unp-${player.id}`,
            type: 'unpaid',
            title: 'اشتراك غير مسدد',
            message: `اللاعب ${player.fullName} (${player.membershipCode}) لم يسدد اشتراك الشهر بقيمة ${sub.value} ${db.settings.currency}`,
            playerId: player.id,
            date: sub.startDate,
            read: false
          });
        }
      }
    }

    const combined = [...liveNotifs, ...db.notifications];
    const seen = new Set();
    return combined.filter(n => {
      const key = `${n.type}-${n.playerId || n.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
    return db.settings;
  }
}
