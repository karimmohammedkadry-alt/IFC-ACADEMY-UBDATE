import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as XLSX from 'xlsx';
import { AcademyDB } from './db';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  requireAuth,
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginAttempts
} from './auth';
import { isSupabaseConfigured, getSupabase, setSupabaseConfig } from './supabase';
import { createClient } from '@supabase/supabase-js';
import {
  isGoogleConfigured,
  syncEntityToGoogleSheet,
  uploadBackupToGoogleDrive,
  processSyncQueue
} from './google';

export const app = express();

// Enable CORS and JSON body parser
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request Idempotency Helper
function getIdempotencyKey(req: Request): string | undefined {
  const headerKey = req.headers['x-idempotency-key'] || req.headers['idempotency-key'];
  if (headerKey && typeof headerKey === 'string') return headerKey;
  return req.body?.idempotencyKey;
}

// ==================== HEALTH & DIAGNOSTICS ====================
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    supabaseConfigured: isSupabaseConfigured(),
    googleConfigured: isGoogleConfigured()
  });
});

app.get('/api/diagnostics', async (_req: Request, res: Response) => {
  const isConfigured = isSupabaseConfigured();
  let supabaseTest = { ok: false, message: 'غير متصل (يعمل في وضع التخزين المحلي)' };

  if (isConfigured) {
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase.from('settings').select('count', { count: 'exact', head: true });
        if (!error) {
          supabaseTest = { ok: true, message: 'متصل بنجاح مع Supabase PostgreSQL' };
        } else {
          supabaseTest = { ok: false, message: `ملاحظة اتصال Supabase: ${error.message}` };
        }
      }
    } catch (e: any) {
      supabaseTest = { ok: false, message: e.message || 'فشل الاتصال' };
    }
  }

  res.json({
    status: 'healthy',
    supabase: {
      configured: isConfigured,
      urlPresent: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      keyPresent: Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY),
      test: supabaseTest
    },
    google: {
      configured: isGoogleConfigured(),
      hasClientEmail: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL),
      hasPrivateKey: Boolean(process.env.GOOGLE_PRIVATE_KEY),
      hasSpreadsheetId: Boolean(process.env.GOOGLE_SPREADSHEET_ID),
      hasDriveFolderId: Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID)
    },
    version: '2.0.0'
  });
});

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
    }

    const trimmedUser = String(username).trim();
    const trimmedPass = String(password).trim();
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

    // Check rate limit (5 failed attempts locks for 15 mins)
    const rateCheck = await checkLoginRateLimit(trimmedUser, clientIp);
    if (!rateCheck.allowed) {
      AcademyDB.logActivity(
        'محاولة دخول محظورة',
        'Auth',
        `تم حظر محاولة دخول للمستخدم ${trimmedUser} بسبب تجاوز الحد المسموح من المحاولات`,
        undefined,
        'FAILED'
      );
      return res.status(429).json({
        error: `تم حظر محاولات الدخول مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى المحاولة بعد ${rateCheck.remainingMinutes || 15} دقيقة.`
      });
    }

    const admin = AcademyDB.getAdmin();
    const isUserMatch = admin.username.toLowerCase() === trimmedUser.toLowerCase() || admin.email.toLowerCase() === trimmedUser.toLowerCase();
    const isPassMatch = verifyPassword(trimmedPass, admin.passwordHash);

    if (!isUserMatch || !isPassMatch) {
      const failResult = await recordFailedLogin(trimmedUser, clientIp);
      AcademyDB.logActivity(
        'محاولة دخول فاشلة',
        'Auth',
        `محاولة دخول غير صحيحة باسم المستخدم: ${trimmedUser}`,
        undefined,
        'FAILED'
      );

      if (failResult.locked) {
        return res.status(429).json({
          error: 'تم تجاوز الحد الأقصى للمحاولات (5 محاولات). تم إيقاف تسجيل الدخول مؤقتاً لمدة 15 دقيقة.'
        });
      }

      return res.status(401).json({ error: 'بيانات تسجيل الدخول غير صحيحة.' });
    }

    // Reset rate limit on success
    await resetLoginAttempts(trimmedUser);

    const token = generateToken(admin);
    const { passwordHash, ...safeAdmin } = admin;

    AcademyDB.logActivity(
      'تسجيل دخول ناجح',
      'Auth',
      `قام المسؤول ${admin.name} (${admin.username}) بتسجيل الدخول للنظام`,
      admin.id,
      'SUCCESS'
    );

    return res.json({
      token,
      admin: safeAdmin
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'حدث خطأ في الخادم' });
  }
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  try {
    const admin = AcademyDB.getAdmin();
    const { passwordHash, ...safeAdmin } = admin;
    return res.json(safeAdmin);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.put('/api/auth/profile', (req: Request, res: Response) => {
  try {
    const { name, email, username } = req.body;
    if (!name || !username) {
      return res.status(400).json({ error: 'الاسم واسم المستخدم مطلوبان' });
    }
    const updated = AcademyDB.updateAdmin({ name, email, username });
    AcademyDB.logActivity('تحديث الملف الشخصي', 'Admin', `تم تحديث بيانات المسؤول ${name}`, updated.id);
    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.put('/api/auth/password', (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = AcademyDB.getAdmin();
    
    if (!verifyPassword(currentPassword, admin.passwordHash)) {
      return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور الجديدة يجب ألا تقل عن 6 خانات للأمان' });
    }

    const newHash = hashPassword(newPassword);
    AcademyDB.updateAdmin({}, newHash);
    AcademyDB.logActivity('تغيير كلمة المرور', 'Admin', 'تم تغيير كلمة مرور المسؤول وتشفيرها بنجاح', admin.id);

    return res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ==================== DASHBOARD & STATS ====================
app.get('/api/dashboard/stats', (_req: Request, res: Response) => {
  try {
    const stats = AcademyDB.getDashboardStats();
    return res.json(stats);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ==================== PLAYERS ROUTES ====================
app.get('/api/players', (req: Request, res: Response) => {
  try {
    const { query, group, status } = req.query;
    const players = AcademyDB.getPlayers(
      query as string,
      group as string,
      status as string
    );
    return res.json(players);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/players/:id', (req: Request, res: Response) => {
  try {
    const player = AcademyDB.getPlayerById(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'اللاعب غير موجود' });
    }
    return res.json(player);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/players', (req: Request, res: Response) => {
  try {
    const { fullName, phone, group } = req.body;
    if (!fullName || !phone || !group) {
      return res.status(400).json({ error: 'يرجى ملء جميع الحقول الإلزامية: اسم اللاعب، الهاتف، والمجموعة' });
    }

    const player = AcademyDB.createPlayer(req.body);
    if (player) {
      AcademyDB.logActivity(
        'إضافة لاعب جديد',
        'Player',
        `تم تسجيل اللاعب الجديد ${player.fullName} بكود ${player.membershipCode}`,
        player.id
      );
    }
    return res.status(201).json(player);
  } catch (e: any) {
    return res.status(400).json({ error: e.message || 'فشل إضافة اللاعب' });
  }
});

app.put('/api/players/:id', (req: Request, res: Response) => {
  try {
    const player = AcademyDB.updatePlayer(req.params.id, req.body);
    if (!player) {
      return res.status(404).json({ error: 'اللاعب غير موجود' });
    }
    AcademyDB.logActivity(
      'تعديل بيانات لاعب',
      'Player',
      `تم تعديل بيانات اللاعب ${player.fullName} (${player.membershipCode})`,
      player.id
    );
    return res.json(player);
  } catch (e: any) {
    return res.status(400).json({ error: e.message || 'فشل تحديث بيانات اللاعب' });
  }
});

app.delete('/api/players/:id', (req: Request, res: Response) => {
  try {
    const player = AcademyDB.getPlayerById(req.params.id);
    const playerName = player ? player.fullName : req.params.id;
    const success = AcademyDB.deletePlayer(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'اللاعب غير موجود' });
    }
    AcademyDB.logActivity(
      'حذف لاعب',
      'Player',
      `تم حذف اللاعب ${playerName} من النظام`,
      req.params.id
    );
    return res.json({ success: true, message: 'تم حذف اللاعب وجميع سجلاته بنجاح' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ==================== SUBSCRIPTIONS & RENEWAL ====================
app.get('/api/subscriptions', (req: Request, res: Response) => {
  try {
    const { status, query, group } = req.query;
    const subscriptions = AcademyDB.getSubscriptions({
      status: status as string,
      query: query as string,
      group: group as string
    });
    return res.json(subscriptions);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/subscriptions', (req: Request, res: Response) => {
  try {
    const newSub = AcademyDB.createSubscription(req.body);
    return res.status(201).json(newSub);
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

app.post('/api/subscriptions/renew', async (req: Request, res: Response) => {
  try {
    const idempotencyKey = getIdempotencyKey(req);
    if (idempotencyKey) {
      const cached = await AcademyDB.checkIdempotency(idempotencyKey);
      if (cached) {
        return res.status(200).json(cached);
      }
    }

    const { playerId, planName, value, startDate, endDate, paymentMethod, paidBy, notes, payNow } = req.body;

    if (!playerId || !value || !startDate || !endDate) {
      return res.status(400).json({ error: 'يرجى إدخال جميع بيانات التجديد الإلزامية' });
    }

    const result = AcademyDB.renewSubscription({
      playerId,
      planName,
      value,
      startDate,
      endDate,
      paymentMethod,
      paidBy,
      notes,
      payNow: payNow ?? true,
      idempotencyKey
    });

    if (idempotencyKey) {
      await AcademyDB.saveIdempotency(idempotencyKey, result, 'RENEW_SUBSCRIPTION', 201);
    }

    return res.status(201).json(result);
  } catch (e: any) {
    return res.status(400).json({ error: e.message || 'فشل تجديد الاشتراك' });
  }
});

// ==================== PAYMENTS & INVOICES ====================
app.get('/api/payments', (req: Request, res: Response) => {
  try {
    const { method, status, query, startDate, endDate } = req.query;
    const payments = AcademyDB.getPayments({
      method: method as string,
      status: status as string,
      query: query as string,
      startDate: startDate as string,
      endDate: endDate as string
    });
    return res.json(payments);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/payments', async (req: Request, res: Response) => {
  try {
    const idempotencyKey = getIdempotencyKey(req);
    if (idempotencyKey) {
      const cached = await AcademyDB.checkIdempotency(idempotencyKey);
      if (cached) {
        return res.status(200).json(cached);
      }
    }

    const { playerId, subscriptionId, amount, paymentMethod, paidBy, paymentDate, notes } = req.body;

    if (!playerId || !amount || !paymentMethod) {
      return res.status(400).json({ error: 'يرجى إدخال جميع بيانات الدفع المطلوبة' });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({ error: 'قيمة الدفع يجب أن تكون أكبر من صفر' });
    }

    const payment = AcademyDB.recordPayment({
      playerId,
      subscriptionId,
      amount,
      paymentMethod,
      paidBy,
      paymentDate,
      notes,
      idempotencyKey
    });

    if (idempotencyKey) {
      await AcademyDB.saveIdempotency(idempotencyKey, payment, 'RECORD_PAYMENT', 201);
    }

    return res.status(201).json(payment);
  } catch (e: any) {
    return res.status(400).json({ error: e.message || 'فشل تسجيل الدفع' });
  }
});

app.get('/api/invoices', (req: Request, res: Response) => {
  try {
    const invoices = AcademyDB.getInvoices();
    return res.json(invoices);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ==================== FINANCIAL & REPORTS ====================
app.get('/api/financial/stats', (_req: Request, res: Response) => {
  try {
    const stats = AcademyDB.getFinancialStats();
    return res.json(stats);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/financial/transactions', (req: Request, res: Response) => {
  try {
    const { type, query, startDate, endDate } = req.query;
    const transactions = AcademyDB.getFinancialTransactions({
      type: type as string,
      query: query as string,
      startDate: startDate as string,
      endDate: endDate as string
    });
    return res.json(transactions);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/financial/transactions', async (req: Request, res: Response) => {
  try {
    const idempotencyKey = getIdempotencyKey(req);
    if (idempotencyKey) {
      const cached = await AcademyDB.checkIdempotency(idempotencyKey);
      if (cached) {
        return res.status(200).json(cached);
      }
    }

    const { type, amount, date, description, category, coachName, notes } = req.body;

    if (!type || !amount || !description) {
      return res.status(400).json({ error: 'يرجى تحديد نوع المعاملة والمبلغ والوصف' });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({ error: 'المبلغ يجب أن يكون أكبر من صفر' });
    }

    const tx = AcademyDB.createFinancialTransaction({
      type,
      amount: Number(amount),
      date: date || new Date().toISOString().split('T')[0],
      description,
      category,
      coachName,
      notes,
      idempotencyKey
    });

    if (idempotencyKey) {
      await AcademyDB.saveIdempotency(idempotencyKey, tx, 'CREATE_FINANCIAL_TX', 201);
    }

    return res.status(201).json(tx);
  } catch (e: any) {
    return res.status(400).json({ error: e.message || 'فشل تسجيل المعاملة المالية' });
  }
});

// ==================== COACHES MANAGEMENT ====================
app.get('/api/coaches', (req: Request, res: Response) => {
  try {
    const { group, status, query } = req.query;
    const coaches = AcademyDB.getCoaches({
      group: group as string,
      status: status as string,
      query: query as string
    });
    return res.json(coaches);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/coaches', (req: Request, res: Response) => {
  try {
    const { name, phone, assignedGroup, role, monthlySalary, joinedDate, status, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'اسم المدرب ورقم الهاتف مطلوبان' });
    }
    const coach = AcademyDB.createCoach({
      name,
      phone,
      assignedGroup,
      role,
      monthlySalary,
      joinedDate,
      status,
      notes
    });
    return res.status(201).json(coach);
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

app.put('/api/coaches/:id', (req: Request, res: Response) => {
  try {
    const coach = AcademyDB.updateCoach(req.params.id, req.body);
    return res.json(coach);
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

app.delete('/api/coaches/:id', (req: Request, res: Response) => {
  try {
    AcademyDB.deleteCoach(req.params.id);
    return res.json({ success: true, message: 'تم حذف المدرب بنجاح' });
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

app.post('/api/coaches/payout', (req: Request, res: Response) => {
  try {
    const { coachId, amount, payoutDate, paymentMethod, notes } = req.body;
    if (!coachId || !amount) {
      return res.status(400).json({ error: 'يرجى تحديد المدرب وقيمة الراتب' });
    }
    const tx = AcademyDB.payCoachSalary({
      coachId,
      amount: Number(amount),
      payoutDate,
      paymentMethod: paymentMethod || 'Cash',
      notes
    });
    return res.status(201).json(tx);
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

// ==================== ATTENDANCE ROUTES ====================
app.get('/api/attendance', (req: Request, res: Response) => {
  try {
    const { group, date, playerId, status, query } = req.query;
    const records = AcademyDB.getAttendance({
      group: group as string,
      date: date as string,
      playerId: playerId as string,
      status: status as string,
      query: query as string
    });
    return res.json(records);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/attendance/batch', (req: Request, res: Response) => {
  try {
    const { group, date, records } = req.body;
    if (!group || !date || !Array.isArray(records)) {
      return res.status(400).json({ error: 'بيانات الحضور غير مكتملة' });
    }
    const result = AcademyDB.saveBatchAttendance({ group, date, records });
    AcademyDB.logActivity('تسجيل كشف الحضور', 'Attendance', `تم تسجيل كشف حضور لمجموعة ${group} بتاريخ ${date} (${records.length} لاعب)`);
    return res.json(result);
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

// ==================== ACTIVITY & AUDIT LOGS ====================
app.get('/api/activity-logs', (req: Request, res: Response) => {
  try {
    const { entityType, action, query, startDate, endDate } = req.query;
    const logs = AcademyDB.getActivityLogs({
      entityType: entityType as string,
      action: action as string,
      query: query as string,
      startDate: startDate as string,
      endDate: endDate as string
    });
    return res.json(logs);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ==================== BACKUPS & AUTOMATION ====================
app.get('/api/backups', (_req: Request, res: Response) => {
  try {
    const backups = AcademyDB.getBackups();
    return res.json(backups);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/backups/manual', async (_req: Request, res: Response) => {
  try {
    const players = AcademyDB.getPlayers();
    const payments = AcademyDB.getPayments();
    const attendance = AcademyDB.getAttendance();
    const financial = AcademyDB.getFinancialTransactions();

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(players), 'اللاعبين');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments), 'المدفوعات');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attendance), 'الحضور');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(financial), 'المالية');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `IFC-Academy-Manual-${new Date().toISOString().split('T')[0]}-${Date.now().toString().slice(-4)}.xlsx`;

    let googleDriveFileId: string | undefined;
    if (isGoogleConfigured()) {
      const uploadRes = await uploadBackupToGoogleDrive(buffer, filename, 'Manual');
      if (uploadRes.success) {
        googleDriveFileId = uploadRes.fileId;
      }
    }

    const record = AcademyDB.createBackupRecord('manual', googleDriveFileId, `${Math.round(buffer.length / 1024)} KB`);

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء النسخة الاحتياطية وتخزينها بنجاح',
      backup: record
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'فشل إنشاء النسخة الاحتياطية' });
  }
});

// VERCEL CRON DAILY BACKUP ENDPOINT
app.get('/api/cron/backup', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    // Validate cron secret if configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized Cron Trigger' });
    }

    const players = AcademyDB.getPlayers();
    const payments = AcademyDB.getPayments();
    const attendance = AcademyDB.getAttendance();
    const financial = AcademyDB.getFinancialTransactions();

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(players), 'اللاعبين');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments), 'المدفوعات');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attendance), 'الحضور');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(financial), 'المالية');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `IFC-Academy-Daily-${new Date().toISOString().split('T')[0]}.xlsx`;

    let googleDriveFileId: string | undefined;
    if (isGoogleConfigured()) {
      const uploadRes = await uploadBackupToGoogleDrive(buffer, filename, 'Daily');
      if (uploadRes.success) {
        googleDriveFileId = uploadRes.fileId;
      }
    }

    const record = AcademyDB.createBackupRecord('daily', googleDriveFileId, `${Math.round(buffer.length / 1024)} KB`);

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      backup: record
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ==================== GOOGLE SHEETS & DRIVE DIRECT SYNC ====================
app.post('/api/google/sync-all', async (_req: Request, res: Response) => {
  try {
    if (!isGoogleConfigured()) {
      return res.status(400).json({
        error: 'يرجى إعداد بيانات GOOGLE_SERVICE_ACCOUNT_EMAIL و GOOGLE_PRIVATE_KEY و GOOGLE_SPREADSHEET_ID'
      });
    }

    const players = AcademyDB.getPlayers();
    const payments = AcademyDB.getPayments();
    const attendance = AcademyDB.getAttendance();
    const financial = AcademyDB.getFinancialTransactions();

    // Sync Players
    const playerHeaders = ['الكود', 'الاسم', 'الهاتف', 'المجموعة', 'الحالة', 'تاريخ الميلاد'];
    const playerRows = players.map(p => [p.membershipCode, p.fullName, p.phone, p.group, p.status, p.birthDate]);
    await syncEntityToGoogleSheet('اللاعبين', playerHeaders, playerRows);

    // Sync Payments
    const payHeaders = ['رقم الإيصال', 'كود اللاعب', 'الاسم', 'المبلغ', 'طريقة الدفع', 'التاريخ'];
    const payRows = payments.map(p => [p.receiptNumber, p.membershipCode, p.playerName, p.amount, p.paymentMethod, p.paymentDate]);
    await syncEntityToGoogleSheet('المدفوعات', payHeaders, payRows);

    // Sync Financial
    const finHeaders = ['المعرف', 'النوع', 'المبلغ', 'التاريخ', 'الوصف', 'التصنيف'];
    const finRows = financial.map(f => [f.id, f.type, f.amount, f.date, f.description, f.category || '-']);
    await syncEntityToGoogleSheet('المالية', finHeaders, finRows);

    // Sync Attendance
    const attHeaders = ['التاريخ', 'المجموعة', 'كود اللاعب', 'الاسم', 'الحالة'];
    const attRows = attendance.map(a => [a.date, a.group, a.membershipCode, a.playerName, a.status]);
    await syncEntityToGoogleSheet('الحضور', attHeaders, attRows);

    AcademyDB.logActivity('مزامنة Google Sheets', 'Google', 'تمت مزامنة جميع جداول البيانات بنجاح مع Google Sheets');

    return res.json({
      success: true,
      message: 'تمت مزامنة جميع البيانات مع Google Sheets بنجاح'
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'فشل مزامنة Google Sheets' });
  }
});

// ==================== NOTIFICATIONS ====================
app.get('/api/notifications', (_req: Request, res: Response) => {
  try {
    const notifs = AcademyDB.getNotifications();
    return res.json(notifs);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ==================== SETTINGS ====================
app.get('/api/settings', (_req: Request, res: Response) => {
  try {
    const settings = AcademyDB.getSettings();
    return res.json(settings);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.put('/api/settings', (req: Request, res: Response) => {
  try {
    const settings = AcademyDB.updateSettings(req.body);
    AcademyDB.logActivity('تحديث إعدادات الأكاديمية', 'Settings', 'تم حفظ وتحديث الإعدادات العامة للأكاديمية');
    return res.json(settings);
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

// ==================== SUPABASE CLOUD SYNC ====================
app.get('/api/supabase/status', (_req: Request, res: Response) => {
  const isConfigured = isSupabaseConfigured();
  return res.json({
    configured: isConfigured,
    supabaseUrl: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace(/(https?:\/\/)([^.]+)(.*)/, '$1***$3') : null
  });
});

app.post('/api/supabase/test', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = req.body;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({ error: 'يرجى إدخال عنوان المشروع ومفتاح API لاختبار الاتصال' });
    }

    const testClient = createClient(supabaseUrl.trim(), supabaseKey.trim(), {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Test connection against existing tables (players, user, etc.)
    const { error: testErr } = await testClient.from('players').select('count', { count: 'exact', head: true });
    
    if (testErr && testErr.code !== 'PGRST116') {
      return res.json({
        success: false,
        message: `تعذر الوصول للجداول: ${testErr.message}`
      });
    }

    return res.json({
      success: true,
      message: 'الاتصال بمشروع Supabase ناجح 100% وقاعدة البيانات متجاوبة.'
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'فشل اختبار الاتصال بـ Supabase' });
  }
});

app.post('/api/supabase/config', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseKey } = req.body;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({ error: 'يرجى إدخال عنوان المشروع (URL) ومفتاح الوصول (API Key)' });
    }

    setSupabaseConfig(supabaseUrl, supabaseKey);
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(400).json({ error: 'تعذر تهيئة اتصال Supabase' });
    }

    // Quick test query
    const { error } = await supabase.from('settings').select('count', { count: 'exact', head: true });
    
    AcademyDB.logActivity('تحديث اتصال Supabase', 'Cloud', 'تم تحديث وضبط مفاتيح الاتصال بـ Supabase بنجاح');

    return res.json({
      success: true,
      message: 'تم حفظ مفاتيح الاتصال والتحقق من الربط مع Supabase بنجاح',
      warning: error ? `ملاحظة: ${error.message}` : undefined
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'حدث خطأ أثناء فحص اتصال Supabase' });
  }
});


app.post('/api/supabase/sync', async (_req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(400).json({
        error: 'يرجى ضبط SUPABASE_URL و SUPABASE_ANON_KEY في متغيرات البيئة'
      });
    }

    const dbData = AcademyDB.read();
    const results: Record<string, string> = {};

    if (dbData.players.length > 0) {
      const { error: pErr } = await supabase.from('players').upsert(dbData.players as any);
      results.players = pErr ? `ملاحظة: ${pErr.message}` : 'تم المزامنة بنجاح';
    }

    if (dbData.subscriptions.length > 0) {
      const { error: sErr } = await supabase.from('subscriptions').upsert(dbData.subscriptions as any);
      results.subscriptions = sErr ? `ملاحظة: ${sErr.message}` : 'تم المزامنة بنجاح';
    }

    if (dbData.payments.length > 0) {
      const { error: payErr } = await supabase.from('payments').upsert(dbData.payments as any);
      results.payments = payErr ? `ملاحظة: ${payErr.message}` : 'تم المزامنة بنجاح';
    }

    if (dbData.attendance.length > 0) {
      const { error: attErr } = await supabase.from('attendance').upsert(dbData.attendance as any);
      results.attendance = attErr ? `ملاحظة: ${attErr.message}` : 'تم المزامنة بنجاح';
    }

    if (dbData.settings) {
      const { error: setErr } = await supabase.from('settings').upsert({ id: 'academy_settings', ...dbData.settings } as any);
      results.settings = setErr ? `ملاحظة: ${setErr.message}` : 'تم المزامنة بنجاح';
    }

    AcademyDB.logActivity('مزامنة Supabase', 'Cloud', 'تمت مزامنة بيانات الأكاديمية مع سحابة Supabase');

    return res.json({
      success: true,
      message: 'تمت مزامنة البيانات مع مشروع Supabase السحابي بنجاح',
      results
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'فشل الاتصال بـ Supabase' });
  }
});

// ==================== EXCEL EXPORT ROUTES ====================
app.get('/api/export/players', (_req: Request, res: Response) => {
  try {
    const players = AcademyDB.getPlayers();
    const exportData = players.map(p => ({
      'كود العضوية': p.membershipCode,
      'اسم اللاعب': p.fullName,
      'رقم الهاتف': p.phone,
      'تاريخ الميلاد': p.birthDate,
      'العمر': p.age,
      'المجموعة': p.group,
      'الحالة': p.status === 'Active' ? 'نشط' : 'غير نشط',
      'اسم ولي الأمر': p.parent ? p.parent.parentName : '-',
      'هاتف ولي الأمر': p.parent ? p.parent.parentPhone : '-',
      'صلة القرابة': p.parent ? p.parent.relationship : '-',
      'هاتف الطوارئ': p.parent ? p.parent.emergencyPhone : '-',
      'حالة الاشتراك': p.activeSubscription ? (p.activeSubscription.status === 'Paid' ? 'مدفوع' : p.activeSubscription.status === 'Unpaid' ? 'غير مدفوع' : 'منتهي') : 'لا يوجد',
      'تاريخ التسجيل': p.createdAt.split('T')[0]
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'اللاعبين');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="IFC-Academy-Players.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/export/payments', (_req: Request, res: Response) => {
  try {
    const payments = AcademyDB.getPayments();
    const exportData = payments.map(p => ({
      'رقم الإيصال': p.receiptNumber,
      'كود العضوية': p.membershipCode,
      'اسم اللاعب': p.playerName,
      'قيمة الاشتراك': p.amount,
      'طريقة الدفع': p.paymentMethod === 'Cash' ? 'نقدي (Cash)' : p.paymentMethod === 'Wallet' ? 'محفظة إلكترونية (Wallet)' : 'إنستاباي (InstaPay)',
      'تاريخ الدفع': p.paymentDate,
      'الحالة': 'مدفوع',
      'ملاحظات': p.notes || '-'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'سجل المدفوعات');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="IFC-Academy-Payments.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/export/attendance', (_req: Request, res: Response) => {
  try {
    const attendance = AcademyDB.getAttendance();
    const exportData = attendance.map(a => ({
      'التاريخ': a.date,
      'المجموعة': a.group,
      'كود العضوية': a.membershipCode,
      'اسم اللاعب': a.playerName,
      'حالة الحضور': a.status === 'Present' ? 'حاضر' : 'غائب',
      'ملاحظات': a.notes || '-'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'سجل الحضور');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="IFC-Academy-Attendance.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/export/financial', (_req: Request, res: Response) => {
  try {
    const transactions = AcademyDB.getFinancialTransactions();
    const exportData = transactions.map(t => ({
      'المعرف': t.id,
      'النوع': t.type === 'income' ? 'إيداع' : t.type === 'expense' ? 'مصروف' : t.type === 'salary' ? 'راتب مدرب' : 'سحب',
      'المبلغ': t.amount,
      'التاريخ': t.date,
      'الوصف': t.description,
      'التصنيف / الفئة': t.category || '-',
      'اسم المدرب': t.coachName || '-',
      'ملاحظات': t.notes || '-'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'المعاملات المالية');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="IFC-Academy-Financial.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/export/activity-logs', (_req: Request, res: Response) => {
  try {
    const logs = AcademyDB.getActivityLogs();
    const exportData = logs.map(l => ({
      'المعرف': l.id,
      'العملية': l.action,
      'نوع الكيان': l.entityType,
      'الوصف والتفاصيل': l.description,
      'الحالة': l.status,
      'التوقيت': l.timestamp
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'سجل النشاطات');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="IFC-Academy-Activity-Log.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});
