import React, { useState, useEffect } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  customLogoUrl?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '', customLogoUrl }) => {
  const [logoSrc, setLogoSrc] = useState<string>(() => {
    return customLogoUrl || localStorage.getItem('ifc_custom_logo') || '/logo.svg';
  });

  useEffect(() => {
    const updateSrc = () => {
      const saved = customLogoUrl || localStorage.getItem('ifc_custom_logo') || '/logo.svg';
      setLogoSrc(saved);
    };
    updateSrc();

    window.addEventListener('storage', updateSrc);
    return () => window.removeEventListener('storage', updateSrc);
  }, [customLogoUrl]);

  const iconSizes = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className={`relative ${iconSizes[size]} flex items-center justify-center shrink-0`}>
        <div className="absolute inset-0 bg-yellow-400/25 rounded-full blur-md animate-pulse"></div>
        <img
          src={logoSrc}
          alt="IFC ACADEMY"
          className="relative w-full h-full object-contain rounded-full drop-shadow-[0_4px_12px_rgba(250,204,21,0.5)] border-2 border-yellow-400/60 bg-black/40"
          onError={() => setLogoSrc('/logo.svg')}
        />
      </div>

      {showText && (
        <div className="flex flex-col text-right">
          <div className={`font-black tracking-wider uppercase bg-gradient-to-r from-white via-yellow-200 to-yellow-400 bg-clip-text text-transparent leading-tight ${textSizes[size]}`}>
            IFC ACADEMY
          </div>
          <div className="text-[10px] sm:text-xs font-bold tracking-wider text-yellow-400">
            <span>IFC ACADEMY</span>
          </div>
        </div>
      )}
    </div>
  );
};
