import React from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  return (
    <footer className={`border-t border-[#1f1f23] bg-[#070708] py-5 px-4 text-center text-xs text-zinc-400 ${className}`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Academy Rights */}
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="font-semibold text-zinc-300">IFC ACADEMY</span>
          <span>•</span>
          <span>نظام الإدارة الرياضية الموحد © {new Date().getFullYear()}</span>
        </div>

        {/* Company Credits with Link */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">من صناعة شركة</span>
          <a
            id="link-codex-company"
            href="https://karimmohammedkadry-alt.github.io/HIK-DEV/cv.html"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border border-yellow-500/30 hover:border-yellow-400 text-yellow-300 hover:text-yellow-200 transition-all font-black tracking-widest shadow-sm hover:shadow-yellow-500/20 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400 group-hover:rotate-12 transition-transform" />
            <span className="font-mono text-xs font-black tracking-widest">C O ᗪ Ξ X</span>
            <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      </div>
    </footer>
  );
};
