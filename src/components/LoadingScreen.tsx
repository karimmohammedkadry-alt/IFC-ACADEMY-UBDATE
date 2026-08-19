import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { Logo } from './Logo';

interface LoadingScreenProps {
  onComplete?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState('جاري تهيئة النظام وتحميل الموارد...');

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const step = Math.floor(Math.random() * 12) + 8;
        const next = Math.min(100, prev + step);
        
        if (next >= 100) {
          setStageText('اكتمل التحميل بنجاح...');
          setTimeout(() => {
            if (onComplete) {
              onComplete();
            }
          }, 350);
          return 100;
        } else if (next > 70) {
          setStageText('جاري تجهيز بيئة العمل ونظام الدخول...');
        } else if (next > 35) {
          setStageText('جاري الاتصال بقاعدة البيانات والتحقق...');
        } else {
          setStageText('جاري تهيئة النظام وتحميل الموارد...');
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center p-6 overflow-hidden select-none">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-[#050505] to-[#050505] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl animate-pulse pointer-events-none" />

      {/* Main Center Animated Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6 relative z-10 w-full max-w-sm"
      >
        {/* Animated Brand Logo in Center */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-4 rounded-full border border-yellow-400/20 animate-ping opacity-30" />
          <Logo size="xl" showText={true} className="flex-col text-center" />
        </div>

        {/* Loading Progress Bar Underneath */}
        <div className="w-full bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-5 shadow-2xl shadow-black relative overflow-hidden">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-white tracking-wide">{stageText}</span>
            <span className="font-mono text-sm font-black text-yellow-400">{Math.min(100, progress)}%</span>
          </div>

          {/* Animated Progress Track */}
          <div className="w-full h-2.5 bg-[#151518] rounded-full overflow-hidden p-0.5 border border-[#27272a]">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300 rounded-full shadow-[0_0_12px_rgba(250,204,21,0.6)]"
              style={{ width: `${Math.min(100, progress)}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
        </div>
      </motion.div>

      {/* Bottom Footer Credit */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-zinc-400 z-10 flex items-center justify-center gap-2">
        <span>من صناعة شركة</span>
        <a
          href="https://karimmohammedkadry-alt.github.io/HIK-DEV/cv.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 font-mono font-bold tracking-wider hover:border-yellow-400 transition-all text-xs"
        >
          <Sparkles className="w-3 h-3 text-yellow-400" />
          <span>C O ᗪ Ξ X</span>
        </a>
      </div>
    </div>
  );
};
