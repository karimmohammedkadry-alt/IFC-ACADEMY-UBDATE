import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles, Trophy, Award, CheckCircle2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Footer } from '../components/Footer';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { success, error } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      error('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password.trim());
      success('مرحباً بك في نظام إدارة IFC ACADEMY');
    } catch (err: any) {
      error(err.message || 'بيانات الدخول غير صحيحة، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background martial aura & radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,_var(--tw-gradient-stops))] from-yellow-500/10 via-[#050505] to-[#050505] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Subtle martial watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-[800px] h-[800px] text-yellow-400 fill-current">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M48 27 L53 37 L65 31 L68 35 L55 42 L57 54 L69 68 L64 72 L53 58 L46 62 L43 78 L37 77 L41 57 L44 43 L34 46 L31 41 L45 36 Z" />
        </svg>
      </div>

      {/* Main Split-Screen Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 z-10 max-w-6xl w-full mx-auto">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT SIDE: Brand Identity & Logo */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-right space-y-6"
          >
            {/* Academy Headline on Top */}
            <div className="space-y-3 max-w-lg">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>لوحة تحكم الأكاديمية</span>
              </div>
              
              <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight">
                أكاديمية <span className="bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">IFC ACADEMY</span>
              </h1>
              
              <p className="text-zinc-400 text-sm leading-relaxed">
                نظام إدارة ومتابعة بيانات اللاعبين، الاشتراكات والمدفوعات، وتسجيل الحضور اليومي بكل دقة وسهولة.
              </p>
            </div>

            {/* Main Brand Logo Underneath the Name */}
            <div className="relative pt-2">
              <div className="absolute -inset-4 bg-yellow-400/20 rounded-full blur-2xl animate-pulse" />
              <Logo size="xl" showText={false} className="hover:scale-105 transition-transform duration-300" />
            </div>
          </motion.div>

          {/* RIGHT SIDE: Login Sheet / Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
            className="lg:col-span-6 w-full max-w-md mx-auto"
          >
            <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-3xl p-7 sm:p-9 shadow-2xl shadow-black relative overflow-hidden backdrop-blur-xl">
              {/* Top Gold accent border */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300" />

              {/* Form Title */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">تسجيل الدخول</h2>
                    <p className="text-xs text-zinc-400">لوحة الإدارة</p>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 text-right">
                    اسم المستخدم <span className="text-yellow-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                      <User className="w-4 h-4 text-yellow-400/90" />
                    </div>
                    <input
                      id="login-username"
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="أدخل اسم المستخدم"
                      required
                      autoComplete="username"
                      className="w-full pr-10 pl-4 py-3 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all text-right"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 text-right">
                    كلمة المرور <span className="text-yellow-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Lock className="w-4 h-4 text-yellow-400/90" />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور"
                      required
                      autoComplete="current-password"
                      className="w-full pr-10 pl-11 py-3 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all text-right"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-3 py-3.5 px-4 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-black text-sm tracking-wide shadow-xl shadow-yellow-500/25 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>دخول لوحة التحكم</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Global Footer with C O ᗪ Ξ X */}
      <Footer />
    </div>
  );
};
