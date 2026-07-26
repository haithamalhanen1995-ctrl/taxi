import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check, Car } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, LANGUAGES, TRANSLATIONS } from '../types';

interface HeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentLang, onLanguageChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[currentLang];
  const activeLangObj = LANGUAGES.find((l) => l.id === currentLang) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="w-full flex items-center justify-between py-4 px-2 select-none border-b border-[#2e3140]/60 mb-6">
      {/* Logo & Brand */}
      <div className="flex items-center gap-3">
        {/* Circular Taxi Badge with Amber-Copper Gradient */}
        <div className="relative flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-[#e8a33d] to-[#c97b3d] p-0.5 shadow-md shadow-[#e8a33d]/20 shrink-0">
          <div className="w-full h-full rounded-full bg-[#1b1d28] flex items-center justify-center border border-[#e8a33d]/30">
            <Car className="w-5 h-5 text-[#e8a33d]" />
          </div>
          {/* Subtle pulse accent */}
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e8a33d] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#e8a33d]"></span>
          </span>
        </div>

        {/* Brand Name & Tagline */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-xl text-[#f3efe6] font-cairo tracking-tight leading-none">
              {t.appName}
            </span>
          </div>
          <span className="font-plex text-[10px] text-[#9b98a6] tracking-widest uppercase mt-0.5 font-semibold">
            {t.appTagline}
          </span>
        </div>
      </div>

      {/* Language Switcher Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          id="language-switcher-btn"
          aria-expanded={isOpen}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1b1d28] hover:bg-[#232634] border border-[#2e3140] text-[#f3efe6] text-xs font-medium font-cairo transition-all duration-200 active:scale-95 focus:outline-none focus:border-[#e8a33d]"
        >
          <Globe className="w-3.5 h-3.5 text-[#e8a33d]" />
          <span className="hidden sm:inline-block text-[#9b98a6]">{activeLangObj.flag}</span>
          <span>{activeLangObj.name}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-[#9b98a6] transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#e8a33d]' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`absolute top-full mt-2 w-48 rounded-xl bg-[#1b1d28] border border-[#2e3140] shadow-2xl shadow-black/60 p-1 z-50 overflow-hidden ${
                activeLangObj.dir === 'rtl' ? 'left-0' : 'right-0'
              }`}
            >
              <div className="px-3 py-2 border-b border-[#2e3140]/60 mb-1">
                <p className="text-[11px] font-semibold text-[#9b98a6] font-cairo">اختر اللغة / Select Language</p>
              </div>
              <div className="space-y-0.5">
                {LANGUAGES.map((lang) => {
                  const isSelected = currentLang === lang.id;
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => {
                        onLanguageChange(lang.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-cairo text-right transition-colors ${
                        isSelected
                          ? 'bg-[#232634] text-[#e8a33d] font-bold border border-[#e8a33d]/20'
                          : 'text-[#f3efe6] hover:bg-[#232634]/70 hover:text-[#e8a33d]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{lang.flag}</span>
                        <span>{lang.nativeName}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#e8a33d]" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
