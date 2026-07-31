import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Compass, Calendar, Sun, Moon } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface NavbarProps {
  onNavigate: (sectionId: string) => void;
  activeSection: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const { theme, toggleTheme } = useData();
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isLight = theme === 'light';

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, delay: 0.2, ease: 'easeInOut' }}
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500 font-sans ${
        scrolled
          ? isLight
            ? 'bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E5DEC9] py-4 shadow-xl text-[#231F1D]'
            : 'bg-[#0C0805]/95 backdrop-blur-md border-b border-amber-950/40 py-4 shadow-2xl text-white'
          : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent py-5 text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
        {/* Brand Logo (Left) */}
        <div
          onClick={() => onNavigate('hero')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shadow-xl group-hover:scale-105 transition-transform ${
              isLight && scrolled
                ? 'bg-[#B8860B] text-white shadow-amber-900/10'
                : 'bg-[#d4af37] text-[#0C0805] shadow-amber-500/20'
            }`}
          >
            <Compass className="w-5 h-5" />
          </div>
          <span
            className={`font-extrabold text-base tracking-[0.2em] uppercase font-sans ${
              isLight && scrolled ? 'text-[#231F1D]' : 'text-white drop-shadow-md'
            }`}
          >
            TRIP
            <span
              className={
                isLight && scrolled ? 'text-[#B8860B]' : 'text-[#d4af37]'
              }
            >
              BUDDY
            </span>
          </span>
        </div>

        {/* Navigation Links (REMOVED BẢN ĐỒ AS REQUESTED) */}
        <nav
          className={`hidden md:flex items-center gap-8 text-[11px] font-extrabold tracking-[0.2em] uppercase font-sans ${
            isLight && scrolled ? 'text-[#231F1D]' : 'text-white drop-shadow-md'
          }`}
        >
          <button
            onClick={() => onNavigate('hero')}
            className={`transition-colors py-1 cursor-pointer ${
              isLight && scrolled
                ? 'hover:text-[#B8860B]'
                : 'hover:text-[#d4af37]'
            }`}
          >
            TRANG CHỦ
          </button>

          <button
            onClick={() => onNavigate('journeys')}
            className={`transition-colors py-1 cursor-pointer ${
              isLight && scrolled
                ? 'hover:text-[#B8860B]'
                : 'hover:text-[#d4af37]'
            }`}
          >
            ĐIỂM ĐẾN
          </button>

          <button
            onClick={() => onNavigate('wheel')}
            className={`transition-colors py-1 cursor-pointer ${
              isLight && scrolled
                ? 'hover:text-[#B8860B]'
                : 'hover:text-[#d4af37]'
            }`}
          >
            DI SẢN
          </button>

          <button
            onClick={() => onNavigate('canvas')}
            className={`transition-colors py-1 flex items-center gap-1.5 font-black cursor-pointer ${
              isLight && scrolled
                ? 'text-[#B8860B] hover:text-[#9E7B1A]'
                : 'text-[#d4af37] hover:text-amber-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            LẬP KẾ HOẠCH
          </button>
        </nav>

        {/* Right Action Button & Theme Toggle */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Sun / Moon */}
          <button
            onClick={toggleTheme}
            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-md ${
              isLight && scrolled
                ? 'bg-[#F4F0E8] border-[#D4C5A9] text-[#B8860B] hover:bg-[#E5DEC9]'
                : 'bg-[#14100c]/80 border-[#d4af37]/50 text-[#d4af37] hover:bg-[#d4af37] hover:text-[#0C0805]'
            }`}
            title={
              isLight
                ? 'Chuyển sang Giao diện Tối (Dark)'
                : 'Chuyển sang Giao diện Sáng (Light)'
            }
          >
            {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onNavigate('canvas')}
            className={`font-black text-[11px] tracking-[0.2em] uppercase px-6 py-2.5 rounded-full border transition-all shadow-xl cursor-pointer font-sans ${
              isLight && scrolled
                ? 'bg-[#B8860B] hover:bg-[#9E7B1A] text-white border-[#B8860B]'
                : 'bg-[#d4af37] hover:bg-amber-400 text-[#0C0805] border-[#d4af37]'
            }`}
          >
            TẠO LỊCH TRÌNH
          </button>
        </div>
      </div>
    </motion.header>
  );
};
