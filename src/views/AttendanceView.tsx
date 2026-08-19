import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Save,
  Filter,
  Users,
  Search,
  Check,
  X,
  History,
  Calendar
} from 'lucide-react';
import { Player, PlayerGroup, AttendanceRecord, AttendanceStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface AttendanceViewProps {
  onSelectPlayer: (id: string) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ onSelectPlayer }) => {
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'record' | 'history'>('record');

  // Record Attendance state
  const [selectedGroup, setSelectedGroup] = useState<PlayerGroup>('ناشئين');
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [groupPlayers, setGroupPlayers] = useState<Player[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: AttendanceStatus; notes: string }>>({});
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // History state
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [historyGroupFilter, setHistoryGroupFilter] = useState<string>('All');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('All');
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load group players and existing attendance for that date
  const loadGroupAndAttendance = async () => {
    setIsLoadingGroup(true);
    try {
      // 1. Get all active players in group
      const players = await api.getPlayers({ group: selectedGroup });
      setGroupPlayers(players);

      // 2. Get existing records for this date and group
      const existing = await api.getAttendance({ group: selectedGroup, date: attendanceDate });
      
      const newMap: Record<string, { status: AttendanceStatus; notes: string }> = {};
      players.forEach(p => {
        const found = existing.find(e => e.playerId === p.id);
        newMap[p.id] = {
          status: found ? found.status : 'Present', // default to Present
          notes: found ? (found.notes || '') : ''
        };
      });

      setAttendanceMap(newMap);
    } catch (err: any) {
      error(err.message || 'فشل تحميل قائمة الحضور للمجموعة');
    } finally {
      setIsLoadingGroup(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'record') {
      loadGroupAndAttendance();
    } else {
      loadHistory();
    }
  }, [selectedGroup, attendanceDate, activeTab]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const records = await api.getAttendance({
        group: historyGroupFilter,
        status: historyStatusFilter,
        date: historyDateFilter || undefined
      });
      setHistoryRecords(records);
    } catch (err: any) {
      error(err.message || 'فشل تحميل سجل الحضور التاريخي');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [historyGroupFilter, historyStatusFilter, historyDateFilter]);

  const handleToggleStatus = (playerId: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        status
      }
    }));
  };

  const handleNotesChange = (playerId: string, notes: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        notes
      }
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, { status: AttendanceStatus; notes: string }> = {};
    groupPlayers.forEach(p => {
      updated[p.id] = {
        status,
        notes: attendanceMap[p.id]?.notes || ''
      };
    });
    setAttendanceMap(updated);
    success(`تم تحديد جميع لاعبي مجموعة "${selectedGroup}" كـ (${status === 'Present' ? 'حاضر' : 'غائب'})`);
  };

  const handleSaveAttendance = async () => {
    if (groupPlayers.length === 0) {
      error('لا يوجد لاعبين في هذه المجموعة لتسجيل حضورهم');
      return;
    }

    setIsSaving(true);
    try {
      const records = groupPlayers.map(p => ({
        playerId: p.id,
        status: attendanceMap[p.id]?.status || 'Present',
        notes: attendanceMap[p.id]?.notes || ''
      }));

      await api.saveBatchAttendance({
        group: selectedGroup,
        date: attendanceDate,
        records
      });

      success(`تم حفظ كشف حضور مجموعة "${selectedGroup}" بتاريخ ${attendanceDate} بنجاح`);
    } catch (err: any) {
      error(err.message || 'فشل حفظ سجل الحضور');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportAttendance = () => {
    window.open(api.exportAttendanceUrl, '_blank');
    success('جاري تصدير سجل الحضور كملف إكسيل...');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f1f23] pb-6">
        <div>
          <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>IFC ACADEMY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">حضور المجموعات</h1>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportAttendance}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0a0a0a] hover:bg-[#151518] text-zinc-200 hover:text-white border border-[#1f1f23] font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير إكسيل</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1f1f23] pb-2">
        <button
          onClick={() => setActiveTab('record')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'record'
              ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/30'
              : 'text-zinc-400 hover:text-white hover:bg-[#151518]'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>تسجيل حضور المجموعة اليومي</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/30'
              : 'text-zinc-400 hover:text-white hover:bg-[#151518]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>السجل التاريخي للحضور</span>
        </button>
      </div>

      {activeTab === 'record' ? (
        /* TAB 1: RECORD ATTENDANCE BY GROUP */
        <div className="space-y-6">
          {/* Controls Bar: Group Selector + Date Picker + Bulk Action Buttons */}
          <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              
              {/* Group Selector */}
              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  اختر المجموعة التدريبية (Group)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['براعم', 'ناشئين', 'شباب'] as PlayerGroup[]).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSelectedGroup(g)}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        selectedGroup === g
                          ? 'bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-500/20'
                          : 'bg-[#050505] text-zinc-300 border-[#1f1f23] hover:border-zinc-700'
                      }`}
                    >
                      <span>{g}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Picker */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  تاريخ التمرين (Date)
                </label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={e => setAttendanceDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                />
              </div>

              {/* Bulk Actions */}
              <div className="sm:col-span-3 flex flex-col justify-end">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  إجراءات سريعة
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMarkAll('Present')}
                    className="flex-1 py-2.5 px-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                  >
                    الكل حاضر
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkAll('Absent')}
                    className="flex-1 py-2.5 px-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                  >
                    الكل غائب
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Players Attendance List */}
          <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-[#050505] border-b border-[#1f1f23] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-bold text-white">
                  قائمة لاعبي مجموعة <strong className="text-yellow-400 font-extrabold">{selectedGroup}</strong> ({groupPlayers.length} لاعب)
                </span>
              </div>
              <span className="text-xs text-zinc-400 font-mono">{attendanceDate}</span>
            </div>

            {isLoadingGroup ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-zinc-400">جاري تحميل لاعبي المجموعة...</p>
              </div>
            ) : groupPlayers.length === 0 ? (
              <div className="py-16 text-center text-zinc-400 text-xs">
                لا يوجد لاعبين مسجلين في مجموعة "{selectedGroup}".
              </div>
            ) : (
              <div className="divide-y divide-[#1f1f23]/60">
                {groupPlayers.map(player => {
                  const state = attendanceMap[player.id] || { status: 'Present', notes: '' };
                  const isPresent = state.status === 'Present';

                  return (
                    <div
                      key={player.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#121215] transition-colors"
                    >
                      {/* Player Info */}
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectPlayer(player.id)}>
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border transition-colors ${
                            isPresent
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {player.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white hover:text-yellow-300 transition-colors">
                              {player.fullName}
                            </span>
                            <span className="font-mono text-[11px] text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20 font-bold">
                              {player.membershipCode}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-400">{player.phone}</span>
                        </div>
                      </div>

                      {/* Notes & Presence Toggle Controls */}
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={state.notes}
                          onChange={e => handleNotesChange(player.id, e.target.value)}
                          placeholder="ملاحظات الحضور أو العذر..."
                          className="px-3 py-2 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-xs placeholder-zinc-500 focus:border-yellow-400 focus:outline-none w-48 sm:w-60"
                        />

                        {/* Presence Toggle Buttons */}
                        <div className="flex items-center gap-1.5 bg-[#050505] p-1 rounded-xl border border-[#1f1f23]">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(player.id, 'Present')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isPresent
                                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-950'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>حاضر</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(player.id, 'Absent')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              !isPresent
                                ? 'bg-rose-500 text-white shadow-md shadow-rose-950'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>غائب</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Save Attendance Bar */}
            <div className="p-4 sm:p-5 bg-[#050505] border-t border-[#1f1f23] flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                تأكد من مراجعة الحضور والغياب قبل الحفظ النهائي في قاعدة البيانات.
              </span>

              <button
                id="btn-save-attendance"
                type="button"
                onClick={handleSaveAttendance}
                disabled={isSaving || groupPlayers.length === 0}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-black text-sm shadow-xl shadow-yellow-500/20 transition-all transform active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ كشف الحضور (Save Attendance)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: HISTORICAL ATTENDANCE LOG */
        <div className="space-y-6">
          {/* History Filters */}
          <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Group */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">تصفية بالمجموعة</label>
                <select
                  value={historyGroupFilter}
                  onChange={e => setHistoryGroupFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-yellow-400 cursor-pointer text-right"
                >
                  <option value="All">جميع المجموعات</option>
                  <option value="براعم">براعم</option>
                  <option value="ناشئين">ناشئين</option>
                  <option value="شباب">شباب</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">تصفية بالحالة</label>
                <select
                  value={historyStatusFilter}
                  onChange={e => setHistoryStatusFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-yellow-400 cursor-pointer text-right"
                >
                  <option value="All">الكل (حاضر وغائب)</option>
                  <option value="Present">حاضر (Present)</option>
                  <option value="Absent">غائب (Absent)</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">تصفية بالتاريخ</label>
                <input
                  type="date"
                  value={historyDateFilter}
                  onChange={e => setHistoryDateFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>
          </div>

          {/* History Records Table */}
          <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl shadow-xl overflow-hidden">
            {isLoadingHistory ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-zinc-400">جاري تحميل سجلات الحضور...</p>
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <CalendarCheck className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">لا توجد سجلات حضور حتى الآن.</h3>
                <p className="text-xs text-zinc-400">قم بتسجيل حضور اليوم من التبويب السابق.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#050505] border-b border-[#1f1f23] text-zinc-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-4 pr-6">التاريخ</th>
                      <th className="py-4 px-4">اسم اللاعب</th>
                      <th className="py-4 px-4">كود العضوية</th>
                      <th className="py-4 px-4">المجموعة</th>
                      <th className="py-4 px-4">حالة الحضور</th>
                      <th className="py-4 pl-6 text-left">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f23]/60">
                    {historyRecords.map(rec => (
                      <tr
                        key={rec.id}
                        className="hover:bg-[#121215] transition-colors cursor-pointer"
                        onClick={() => onSelectPlayer(rec.playerId)}
                      >
                        <td className="py-4 pr-6 font-mono text-zinc-300 font-bold">{rec.date}</td>
                        <td className="py-4 px-4 font-bold text-white">{rec.playerName}</td>
                        <td className="py-4 px-4 font-mono text-yellow-400">{rec.membershipCode}</td>
                        <td className="py-4 px-4">
                          <StatusBadge status={rec.group} type="group" />
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge status={rec.status} type="attendance" />
                        </td>
                        <td className="py-4 pl-6 text-left text-zinc-400">{rec.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
