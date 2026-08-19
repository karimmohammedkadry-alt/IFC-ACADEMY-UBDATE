import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  UserPlus,
  FileSpreadsheet,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Phone,
  Users,
  RefreshCw
} from 'lucide-react';
import { Player, PlayerGroup, PlayerStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmModal } from '../components/ConfirmModal';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface PlayersViewProps {
  onSelectPlayer: (id: string) => void;
  onOpenAddPlayer: () => void;
  onEditPlayer: (player: Player) => void;
}

export const PlayersView: React.FC<PlayersViewProps> = ({
  onSelectPlayer,
  onOpenAddPlayer,
  onEditPlayer
}) => {
  const { success, error } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Menu state for ⋮ dropdown
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Delete modal state
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);

  const loadPlayers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPlayers({
        query: searchQuery,
        group: selectedGroup,
        status: selectedStatus
      });
      setPlayers(data);
    } catch (err: any) {
      error(err.message || 'فشل تحميل بيانات اللاعبين');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, [selectedGroup, selectedStatus]);

  // Handle live search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPlayers();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!playerToDelete) return;
    try {
      await api.deletePlayer(playerToDelete.id);
      success(`تم حذف اللاعب "${playerToDelete.fullName}" بنجاح`);
      setPlayerToDelete(null);
      loadPlayers();
    } catch (err: any) {
      error(err.message || 'فشل حذف اللاعب');
    }
  };

  const handleExportExcel = () => {
    window.open(api.exportPlayersUrl, '_blank');
    success('جاري تصدير ملف إكسيل للاعبين...');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f1f23] pb-6">
        <div>
          <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>IFC ACADEMY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">اللاعبين</h1>
        </div>

        {/* Action Buttons: Export Excel & Add Player */}
        <div className="flex items-center gap-3">
          <button
            id="btn-export-players"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0a0a0a] hover:bg-[#151518] text-zinc-200 hover:text-white border border-[#1f1f23] font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير إكسيل</span>
          </button>

          <button
            id="btn-add-player-main"
            onClick={onOpenAddPlayer}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-black text-xs sm:text-sm shadow-lg shadow-yellow-500/20 transition-all transform active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة لاعب جديد</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
          
          {/* Search Input */}
          <div className="sm:col-span-6 relative">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-4 h-4 text-yellow-400/80" />
            </div>
            <input
              id="input-player-search"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="البحث بالاسم، كود العضوية، أو رقم الهاتف..."
              className="w-full pr-10 pl-4 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all text-right"
            />
          </div>

          {/* Group Filter */}
          <div className="sm:col-span-3">
            <div className="relative">
              <select
                id="select-group-filter"
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-yellow-400 cursor-pointer text-right appearance-none"
              >
                <option value="All">جميع المجموعات (All Groups)</option>
                <option value="براعم">براعم</option>
                <option value="ناشئين">ناشئين</option>
                <option value="شباب">شباب</option>
              </select>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Filter className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <div className="relative">
              <select
                id="select-status-filter"
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-yellow-400 cursor-pointer text-right appearance-none"
              >
                <option value="All">جميع الحالات (All Statuses)</option>
                <option value="Active">نشط (Active)</option>
                <option value="Inactive">غير نشط (Inactive)</option>
              </select>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Filter className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Quick Info */}
        <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-[#1f1f23]/60">
          <span>النتائج: <strong className="text-yellow-400 font-mono font-bold">{players.length}</strong> لاعب</span>
          {(searchQuery || selectedGroup !== 'All' || selectedStatus !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedGroup('All');
                setSelectedStatus('All');
              }}
              className="text-yellow-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>
      </div>

      {/* Players Table / List */}
      <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl shadow-xl overflow-hidden" ref={menuRef}>
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-zinc-400">جاري تحميل اللاعبين...</p>
          </div>
        ) : players.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <Users className="w-12 h-12 text-zinc-600 mx-auto" />
            <h3 className="text-base font-bold text-white">لا يوجد لاعبين حتى الآن</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              أضف أول لاعب لبدء إدارة الأكاديمية ومتابعة الاشتراكات والحضور.
            </p>
            <button
              onClick={onOpenAddPlayer}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs cursor-pointer shadow-md shadow-yellow-500/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة لاعب الآن</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#050505] border-b border-[#1f1f23] text-zinc-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-4 pr-6">اسم اللاعب</th>
                  <th className="py-4 px-4">رقم العضوية</th>
                  <th className="py-4 px-4">المجموعة</th>
                  <th className="py-4 px-4">حالة الاشتراك والسداد</th>
                  <th className="py-4 px-4">الهاتف</th>
                  <th className="py-4 px-4">الحالة</th>
                  <th className="py-4 pl-6 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f23]/60">
                {players.map(player => (
                  <tr
                    key={player.id}
                    className="hover:bg-[#121215] transition-colors group cursor-pointer"
                    onClick={() => onSelectPlayer(player.id)}
                  >
                    {/* Player Name */}
                    <td className="py-4 pr-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#151518] border border-[#27272a] flex items-center justify-center text-yellow-400 font-black text-xs shrink-0 group-hover:border-yellow-400/40 transition-colors">
                          {player.fullName.charAt(0)}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white group-hover:text-yellow-300 transition-colors block">
                            {player.fullName}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {player.age} سنة • {player.group}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Membership Code */}
                    <td className="py-4 px-4">
                      <span className="font-mono text-yellow-400 font-bold bg-yellow-400/10 px-2.5 py-1 rounded-lg border border-yellow-400/20">
                        {player.membershipCode}
                      </span>
                    </td>

                    {/* Group */}
                    <td className="py-4 px-4">
                      <StatusBadge status={player.group} type="group" />
                    </td>

                    {/* Subscription & Who Paid */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <StatusBadge
                          status={player.activeSubscription?.status || 'Unpaid'}
                          type="subscription"
                        />
                        {player.activeSubscription && (
                          <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                            <span className="text-zinc-500">القائم بالدفع:</span>
                            <span className="text-yellow-400/90 font-medium">
                              {player.activeSubscription.lastPaidBy || (player.group === 'شباب' ? 'اللاعب' : 'ولي الأمر')}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-4 px-4">
                      <span className="font-mono text-zinc-300 dir-ltr inline-flex items-center gap-1">
                        <Phone className="w-3 h-3 text-zinc-400" />
                        {player.phone}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <StatusBadge status={player.status} type="player" />
                    </td>

                    {/* Actions Menu (⋮) */}
                    <td className="py-4 pl-6 text-left" onClick={e => e.stopPropagation()}>
                      <div className="relative inline-block text-left">
                        <button
                          id={`btn-player-actions-${player.id}`}
                          onClick={() => setActiveMenuId(activeMenuId === player.id ? null : player.id)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#18181b] transition-colors cursor-pointer"
                          title="خيارات"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                          {activeMenuId === player.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 5 }}
                              className="absolute left-0 mt-1 w-44 bg-[#0a0a0a] border border-[#1f1f23] rounded-xl shadow-2xl overflow-hidden z-30 p-1 text-right"
                            >
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onSelectPlayer(player.id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-yellow-300 hover:bg-[#151518] rounded-lg transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-yellow-400" />
                                <span>عرض ملف اللاعب</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onEditPlayer(player);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-[#151518] rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5 text-yellow-400" />
                                <span>تعديل البيانات</span>
                              </button>

                              <div className="border-t border-[#1f1f23] my-1" />

                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setPlayerToDelete(player);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                <span>حذف اللاعب</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!playerToDelete}
        title="تأكيد حذف اللاعب"
        message={`هل أنت متأكد من حذف اللاعب "${playerToDelete?.fullName}"؟ سيتم حذف جميع بياناته وسجلات حضوره ومدفوعاته بشكل نهائي.`}
        confirmText="نعم، حذف اللاعب"
        cancelText="إلغاء"
        isDanger={true}
        onConfirm={handleDeleteConfirm}
        onClose={() => setPlayerToDelete(null)}
      />
    </div>
  );
};
