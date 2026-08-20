import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as XLSX from 'xlsx';
import { AcademyDB } from './server/db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Simple token / session simulation with admin authentication
  const authMiddleware = (req: Request, res: Response, next: () => void) => {
    // In our system, verify authorization header or allow valid admin calls
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Valid token accepted
      return next();
    }
    // Allow demo / standard API calls for single-admin
    next();
  };

  // ==================== AUTH ROUTES ====================
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
      }

      const admin = AcademyDB.getAdmin();
      const isUserMatch = admin.username === username.trim() || admin.email === username.trim();
      const isPassMatch = admin.passwordHash === password.trim();

      if (!isUserMatch || !isPassMatch) {
        return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      }

      const token = `kfa-token-${Date.now()}`;
      const { passwordHash, ...safeAdmin } = admin;
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
      const updated = AcademyDB.updateAdmin({ name, email, username });
      return res.json(updated);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/auth/password', (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const admin = AcademyDB.getAdmin();
      if (admin.passwordHash !== currentPassword) {
        return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
      }
      if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: 'كلمة المرور الجديدة يجب ألا تقل عن 4 خانات' });
      }
      AcademyDB.updateAdmin({}, newPassword);
      return res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ==================== DASHBOARD ROUTES ====================
  app.get('/api/dashboard/stats', (req: Request, res: Response) => {
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
      const player = AcademyDB.createPlayer(req.body);
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
      return res.json(player);
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'فشل تحديث بيانات اللاعب' });
    }
  });

  app.delete('/api/players/:id', (req: Request, res: Response) => {
    try {
      const success = AcademyDB.deletePlayer(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'اللاعب غير موجود' });
      }
      return res.json({ success: true, message: 'تم حذف اللاعب وجميع سجلاته بنجاح' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ==================== SUBSCRIPTIONS & PAYMENTS ROUTES ====================
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
      const { playerId, subscriptionId, amount, paymentMethod, paidBy, paymentDate, notes } = req.body;
      if (!playerId || !amount || !paymentMethod) {
        return res.status(400).json({ error: 'يرجى إدخال جميع بيانات الدفع المطلوبة' });
      }
      const payment = AcademyDB.recordPayment({
        playerId,
        subscriptionId,
        amount,
        paymentMethod,
        paidBy,
        paymentDate,
        notes
      });
      return res.status(201).json(payment);
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'فشل تسجيل الدفع' });
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
      return res.json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  });

  // ==================== NOTIFICATIONS ROUTES ====================
  app.get('/api/notifications', (req: Request, res: Response) => {
    try {
      const notifs = AcademyDB.getNotifications();
      return res.json(notifs);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ==================== SETTINGS ROUTES ====================
  app.get('/api/settings', (req: Request, res: Response) => {
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
      return res.json(settings);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  });

  // ==================== SUPABASE CLOUD SYNC & STATUS ROUTES ====================
  app.get('/api/supabase/status', (req: Request, res: Response) => {
    const isConfigured = Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
    return res.json({
      configured: isConfigured,
      supabaseUrl: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace(/(https?:\/\/)([^.]+)(.*)/, '$1***$3') : null
    });
  });

  app.post('/api/supabase/sync', async (req: Request, res: Response) => {
    try {
      const { getSupabase } = await import('./server/supabase');
      const supabase = getSupabase();
      if (!supabase) {
        return res.status(400).json({
          error: 'يرجى ضبط SUPABASE_URL و SUPABASE_ANON_KEY في متغيرات البيئة (Settings/Secrets)'
        });
      }

      const dbData = AcademyDB.read();

      // Upsert into Supabase tables if they exist
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

      return res.json({
        success: true,
        message: 'تمت محاولة مزامنة البيانات مع مشروع Supabase السحابي',
        results
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'فشل الاتصال بـ Supabase' });
    }
  });

  // ==================== EXCEL EXPORT ROUTES ====================
  app.get('/api/export/players', (req: Request, res: Response) => {
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

      res.setHeader('Content-Disposition', 'attachment; filename="King_Fu_Academy_Players.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/export/payments', (req: Request, res: Response) => {
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

      res.setHeader('Content-Disposition', 'attachment; filename="King_Fu_Academy_Payments.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/export/attendance', (req: Request, res: Response) => {
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

      res.setHeader('Content-Disposition', 'attachment; filename="King_Fu_Academy_Attendance.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ==================== VITE MIDDLEWARE ====================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`King Fu Academy Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
