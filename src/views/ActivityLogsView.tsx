import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  History,
  Search,
  Filter,
  FileSpreadsheet,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  User,
  RefreshCw,
  HardDrive,
  Check
} from 'lucide-react';
import { ActivityLog, BackupRecord } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const ActivityLogsView: React.FC = () => {
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'logs' | 'backups'>('logs');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('All');
  const [isBackingUp, setIsBackingUp] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [logsData, backupsData] = await Promise.all([
        api.getActivityLogs({
          entityType: entityFilter,
          query: searchQuery
        }),
        api.getBackups()
      ]);
      setLogs(logsData);
      setBackups(backupsData);
    } catch (err: any) {
      error(err.message || 'فشل تحميل سجل النشاطات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [entityFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await api.createManualBackup();
      success(`تم إنشاء نسخة احتياطية بنجاح (${res.backup.filename}) ومزامنتها سحابياً`);
      loadData();
    } catch (err: any) {
      error(err.message || 'فشل إنشاء النسخة الاحتياطية');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleExportExcel = () => {
    window.open(api.exportActivityLogsUrl, '_blank');
    success('جاري تصدير سجل النشاطات إلى Excel...');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f1f23] pb-6">
        <div>
          <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1">
            <History className="w-4 h-4" />
            <span>SYSTEM AUDIT & BACKUP</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">سجل النشاطات والنسخ الاحتياطي</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121214] hover:bg-[#18181b] border border-[#27272a] text-zinc-200 hover:text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير السجل Excel</span>
          </button>

          <button
            onClick={handleManualBackup}
            disabled={isBackingUp}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black transition-all shadow-lg shadow-yellow-400/10 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isBackingUp ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري إنشاء النسخة...</span>
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4" />
                <span>نسخ احتياطي فوري</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1f1f23] pb-3">
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-yellow-400 text-black shadow-md'
              : 'text-zinc-400 hover:text-white bg-[#0f0f12]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل الأحداث والعمليات ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('backups')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'backups'
              ? 'bg-yellow-400 text-black shadow-md'
              : 'text-zinc-400 hover:text-white bg-[#0f0f12]'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>النسخ الاحتياطية المؤتمتة ({backups.length})</span>
        </button>
      </div>

      {/* Logs View */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث في نص النشاط أو الوصف..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#121214] border border-[#27272a] rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-zinc-400" />
              <select
                value={entityFilter}
                onChange={e => setEntityFilter(e.target.value)}
                className="bg-[#121214] border border-[#27272a] rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-yellow-400 cursor-pointer"
              >
                <option value="All">جميع الأقسام</option>
                <option value="Auth">تسجيل الدخول والأمان</option>
                <option value="Player">اللاعبين</option>
                <option value="Subscription">الاشتراكات</option>
                <option value="Payment">المدفوعات</option>
                <option value="Financial">المعاملات المالية</option>
                <option value="Attendance">الحضور والغياب</option>
                <option value="Backup">النسخ الاحتياطي</option>
                <option value="Settings">الإعدادات</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#121214] border-b border-[#1f1f23] text-zinc-400 font-bold">
                    <th className="p-4">العملية / الإجراء</th>
                    <th className="p-4">القسم</th>
                    <th className="p-4">التفاصيل والبيان</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">التوقيت والتاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f23]/60 text-zinc-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-zinc-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-yellow-400 mb-2" />
                        جاري تحميل سجل النشاطات...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-zinc-500">
                        لا توجد سجلات نشاط مسجلة
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.id} className="hover:bg-[#121214]/80 transition-colors">
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                          <span>{log.action}</span>
                        </td>
                        <td className="p-4">
                          <span className="bg-[#18181b] border border-[#27272a] text-zinc-300 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                            {log.entityType}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-300 font-normal">{log.description}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {log.status === 'SUCCESS' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {log.status === 'SUCCESS' ? 'ناجح' : 'محظور / فاشل'}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-400 font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString('ar-EG', {
                            dateStyle: 'short',
                            timeStyle: 'medium'
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Backups View */}
      {activeTab === 'backups' && (
        <div className="space-y-4">
          <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">النسخ الاحتياطي السحابي المؤتمت (Google Drive Ready)</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  يقوم النظام بجدولة النسخ الاحتياطي اليومي لجميع سجلات اللاعبين والاشتراكات والمدفوعات والمالية.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold">
                <Check className="w-4 h-4" />
                <span>نظام النسخ مفعل</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#121214] border-b border-[#1f1f23] text-zinc-400 font-bold">
                    <th className="p-4">اسم ملف النسخة</th>
                    <th className="p-4">النوع</th>
                    <th className="p-4">الحجم</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">تاريخ الإنشاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f23]/60 text-zinc-200">
                  {backups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-zinc-500">
                        لا توجد نسخ احتياطية مسجلة بعد. اضغط على "نسخ احتياطي فوري" لإنشاء أول نسخة.
                      </td>
                    </tr>
                  ) : (
                    backups.map(b => (
                      <tr key={b.id} className="hover:bg-[#121214]/80 transition-colors">
                        <td className="p-4 font-mono font-bold text-white flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-yellow-400" />
                          <span>{b.filename}</span>
                        </td>
                        <td className="p-4">
                          <span className="bg-[#18181b] border border-[#27272a] text-zinc-300 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                            {b.type === 'daily' ? 'نسخ يومي تلقائي' : 'نسخ يدوي'}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-zinc-400">{b.fileSize || '34 KB'}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>مكتمل ومحفوظ</span>
                          </span>
                        </td>
                        <td className="p-4 text-zinc-400 font-mono text-[11px]">
                          {new Date(b.createdAt).toLocaleString('ar-EG', {
                            dateStyle: 'short',
                            timeStyle: 'medium'
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
