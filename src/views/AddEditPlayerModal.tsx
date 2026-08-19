import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, User, Phone, Calendar, Users, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { Player, PlayerGroup, PlayerStatus } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface AddEditPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (player: Player) => void;
  playerToEdit?: Player | null;
}

export const AddEditPlayerModal: React.FC<AddEditPlayerModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  playerToEdit
}) => {
  const { success, error } = useToast();

  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [membershipCode, setMembershipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('2015-01-01');
  const [age, setAge] = useState<number>(11);
  const [group, setGroup] = useState<PlayerGroup>('براعم');
  const [status, setStatus] = useState<PlayerStatus>('Active');
  const [notes, setNotes] = useState('');

  // Parent Info (only for براعم and ناشئين)
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [relationship, setRelationship] = useState('الأب');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (playerToEdit) {
      setFullName(playerToEdit.fullName || '');
      setNationalId(playerToEdit.nationalId || '');
      setMembershipCode(playerToEdit.membershipCode || '');
      setPhone(playerToEdit.phone || '');
      setBirthDate(playerToEdit.birthDate || '2015-01-01');
      setAge(playerToEdit.age || 11);
      setGroup(playerToEdit.group || 'براعم');
      setStatus(playerToEdit.status || 'Active');
      setNotes(playerToEdit.notes || '');

      if (playerToEdit.parent) {
        setParentName(playerToEdit.parent.parentName || '');
        setParentPhone(playerToEdit.parent.parentPhone || '');
        setRelationship(playerToEdit.parent.relationship || 'الأب');
        setEmergencyPhone(playerToEdit.parent.emergencyPhone || '');
      } else {
        setParentName('');
        setParentPhone('');
        setRelationship('الأب');
        setEmergencyPhone('');
      }
    } else {
      // Reset form
      setFullName('');
      setNationalId('');
      setMembershipCode('');
      setPhone('');
      setBirthDate('2015-05-15');
      setAge(11);
      setGroup('براعم');
      setStatus('Active');
      setNotes('');
      setParentName('');
      setParentPhone('');
      setRelationship('الأب');
      setEmergencyPhone('');
    }
  }, [playerToEdit, isOpen]);

  // Auto calculate age when birthDate changes
  const handleBirthDateChange = (val: string) => {
    setBirthDate(val);
    if (val) {
      const birth = new Date(val);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge >= 3 && calculatedAge <= 60) {
        setAge(calculatedAge);
        // auto-suggest group based on age if creating
        if (!playerToEdit) {
          if (calculatedAge < 12) setGroup('براعم');
          else if (calculatedAge <= 16) setGroup('ناشئين');
          else setGroup('شباب');
        }
      }
    }
  };

  const showParentFields = group === 'براعم' || group === 'ناشئين';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      error('يرجى كتابة اسم اللاعب ورقم الهاتف');
      return;
    }

    if (showParentFields && (!parentName.trim() || !parentPhone.trim())) {
      error('يرجى ملء بيانات ولي الأمر (الاسم ورقم الهاتف)');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        fullName: fullName.trim(),
        nationalId: nationalId.trim(),
        membershipCode: membershipCode.trim(),
        phone: phone.trim(),
        birthDate,
        age: Number(age) || 10,
        group,
        status,
        notes: notes.trim()
      };

      if (showParentFields) {
        payload.parent = {
          parentName: parentName.trim(),
          parentPhone: parentPhone.trim(),
          relationship: relationship.trim() || 'ولي الأمر',
          emergencyPhone: emergencyPhone.trim() || parentPhone.trim()
        };
      }

      let saved: Player;
      if (playerToEdit) {
        saved = await api.updatePlayer(playerToEdit.id, payload);
        success(`تم تحديث بيانات اللاعب ${saved.fullName} بنجاح`);
      } else {
        saved = await api.createPlayer(payload);
        success(`تمت إضافة اللاعب الجديد ${saved.fullName} بنجاح`);
      }

      onSaved(saved);
      onClose();
    } catch (err: any) {
      error(err.message || 'فشلت عملية حفظ اللاعب');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-[#0a0a0a] border border-[#1f1f23] rounded-3xl shadow-2xl overflow-hidden z-10 my-8 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-[#1f1f23] flex items-center justify-between bg-[#050505]/90 sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {playerToEdit ? 'تعديل بيانات اللاعب' : 'إضافة لاعب جديد (Add Player)'}
                </h2>
                <p className="text-xs text-zinc-400">
                  {playerToEdit ? `كود العضوية: ${playerToEdit.membershipCode}` : 'تسجيل لاعب جديد في قاعدة بيانات الأكاديمية'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#151518] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            
            {/* Section: Basic Info */}
            <div>
              <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>البيانات الأساسية للاعب</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    الاسم الكامل <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="مثال: يوسف أحمد الشاذلي"
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                {/* National ID (الرقم القومي) */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    الرقم القومي (National ID)
                  </label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={e => setNationalId(e.target.value)}
                    placeholder="14 رقم للرقم القومي أو شهادة الميلاد"
                    maxLength={14}
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none font-mono"
                  />
                </div>

                {/* Membership Code */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    كود العضوية (Membership Code)
                  </label>
                  <input
                    type="text"
                    value={membershipCode}
                    onChange={e => setMembershipCode(e.target.value)}
                    placeholder="توليد تلقائي (مثل: KFA-1007)"
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    رقم الهاتف <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                {/* Birth Date */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    تاريخ الميلاد
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={e => handleBirthDateChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                {/* Age */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    العمر (Age)
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="80"
                    value={age}
                    onChange={e => setAge(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                {/* Group Selector */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    المجموعة التدريبية <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['براعم', 'ناشئين', 'شباب'] as PlayerGroup[]).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGroup(g)}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          group === g
                            ? 'bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-500/20'
                            : 'bg-[#050505] text-zinc-300 border-[#1f1f23] hover:border-zinc-700'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    حالة اللاعب
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setStatus('Active')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 cursor-pointer ${
                        status === 'Active'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                          : 'bg-[#050505] text-zinc-400 border-[#1f1f23]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${status === 'Active' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                      <span>نشط (Active)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('Inactive')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 cursor-pointer ${
                        status === 'Inactive'
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                          : 'bg-[#050505] text-zinc-400 border-[#1f1f23]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${status === 'Inactive' ? 'bg-rose-400' : 'bg-zinc-600'}`} />
                      <span>غير نشط (Inactive)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Parent Info (Shown ONLY for براعم & ناشئين as specified) */}
            {showParentFields ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-[#1f1f23] pt-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>بيانات ولي الأمر (خاص بمجموعتي البراعم والناشئين)</span>
                  </h3>
                  <span className="text-[10px] text-zinc-400 bg-[#151518] px-2 py-0.5 rounded-full">مطلوب</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Parent Name */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      اسم ولي الأمر <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required={showParentFields}
                      value={parentName}
                      onChange={e => setParentName(e.target.value)}
                      placeholder="مثال: أحمد الشاذلي خليل"
                      className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                    />
                  </div>

                  {/* Parent Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      رقم هاتف ولي الأمر <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required={showParentFields}
                      value={parentPhone}
                      onChange={e => setParentPhone(e.target.value)}
                      placeholder="01099887766"
                      className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                    />
                  </div>

                  {/* Relationship */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      صلة القرابة
                    </label>
                    <select
                      value={relationship}
                      onChange={e => setRelationship(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none cursor-pointer"
                    >
                      <option value="الأب">الأب</option>
                      <option value="الأم">الأم</option>
                      <option value="الأخ الأكبر">الأخ الأكبر</option>
                      <option value="العم / الخال">العم / الخال</option>
                      <option value="ولي أمر">ولي أمر آخر</option>
                    </select>
                  </div>

                  {/* Emergency Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      رقم الطوارئ (Emergency Phone)
                    </label>
                    <input
                      type="tel"
                      value={emergencyPhone}
                      onChange={e => setEmergencyPhone(e.target.value)}
                      placeholder="رقم إضافي للطوارئ"
                      className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="p-3 bg-[#050505]/80 border border-[#1f1f23] rounded-xl text-xs text-zinc-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>مجموعة الشباب (17 سنة فأكثر) لا تتطلب إدخال بيانات ولي الأمر.</span>
              </div>
            )}

            {/* Notes */}
            <div className="border-t border-[#1f1f23] pt-4">
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                ملاحظات إضافية (الأسلوب، التخصص، أو أي تنبيهات تدريبية)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="ملاحظات حول مستوى اللاعب، موهبته في السندا أو الأساليب..."
                className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
              />
            </div>
          </form>

          {/* Footer */}
          <div className="p-5 border-t border-[#1f1f23] bg-[#050505] flex items-center justify-end gap-3 sticky bottom-0 z-20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white bg-[#0a0a0a] hover:bg-[#151518] transition-colors border border-[#1f1f23] cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-black text-sm shadow-lg shadow-yellow-500/20 transition-all transform active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{playerToEdit ? 'حفظ التعديلات' : 'إضافة اللاعب'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
