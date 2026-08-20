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
import { isSupabaseConfigured, getSupabase } from './supabase';

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
    supabaseConfigured: isSupabaseConfigured()
  });
});

app.get('/api/diagnostics', async (_req: Request, res: Response) => {
  const isConfigured = isSupabaseConfigured();
  let supabaseTest = { ok: false, message: 'غير متصل (يعمل في وضع التخزين المباشر)' };

  if (isConfigured) {
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase.from('settings').select('count', { count: 'exact', head: true });
        if (!error) {
          supabaseTest = { ok: true, message: 'متصل بنجاح مع Supabase' };
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
    version: '2.0.0'
  });
});

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
    }

    const trimmedUser = String(username).trim();
    const trimmedPass = String(password).trim();

    // Check rate limit (5 failed attempts locks for 15 mins)
    const rateCheck = checkLoginRateLimit(trimmedUser);
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
      const failResult = recordFailedLogin(trimmedUser);
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
    resetLoginAttempts(trimmedUser);

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
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'كلمة المرور الجديدة يجب ألا تقل عن 4 خانات' });
    }

    const newHash = hashPassword(newPassword);
    AcademyDB.updateAdmin({}, newHash);
    AcademyDB.logActivity('تغيير كلمة المرور', 'Admin', 'تم تغيير كلمة مرور المسؤول بنجاح', admin.id);

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

app.post('/api/subscriptions/renew', (req: Request, res: Response) => {
  try {
    const idempotencyKey = getIdempotencyKey(req);
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

app.post('/api/payments', (req: Request, res: Response) => {
  try {
    const idempotencyKey = getIdempotencyKey(req);
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

app.post('/api/financial/transactions', (req: Request, res: Response) => {
  try {
    const idempotencyKey = getIdempotencyKey(req);
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

    return res.status(201).json(tx);
  } catch (e: any) {
    return res.status(400).json({ error: e.message || 'فشل تسجيل المعاملة المالية' });
  }
});

// ==================== ATTENDANCE ROUTES ====================
app.get('/api/attendance', (req: Request, res: Response) => {
  try {
    const { group, date, playerId, status } = req.query;
    const records = AcademyDB.getAttendance({
      group: group as string,
      date: date as string,
      playerId: playerId as string,
      status: status as string
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

// ==================== BACKUPS ====================
app.get('/api/backups', (_req: Request, res: Response) => {
  try {
    const backups = AcademyDB.getBackups();
    return res.json(backups);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/backups/manual', (_req: Request, res: Response) => {
  try {
    const record = AcademyDB.createBackupRecord('manual');
    return res.status(201).json({
      success: true,
      message: 'تم إنشاء النسخة الاحتياطية بنجاح',
      backup: record
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'فشل إنشاء النسخة الاحتياطية' });
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
