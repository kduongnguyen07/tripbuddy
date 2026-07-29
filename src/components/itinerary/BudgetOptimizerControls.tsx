import React from 'react';
import { Sliders, Utensils, Hotel, Car, Ticket, Sparkles, RefreshCw, Calendar } from 'lucide-react';

import { OptimizationResult, UserPreferences } from '../../types';
import { useData } from '../../context/DataContext';

interface BudgetOptimizerControlsProps {
  totalBudget: number;
  setTotalBudget: (val: number) => void;
  numDays: number;
  setNumDays: (val: number) => void;
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  result: OptimizationResult | null;
  loading: boolean;
  onRecalculate: () => void;
  onViewItineraryCard: () => void;
}

const CATEGORY_COLORS = {
  stay: '#38bdf8',       // Sky blue
  food: '#d4af37',       // Gold Accent
  transport: '#a855f7',  // Purple
  activities: '#10b981'  // Emerald
};

export const BudgetOptimizerControls: React.FC<BudgetOptimizerControlsProps> = ({
  totalBudget,
  setTotalBudget,
  numDays,
  setNumDays,
  preferences,
  setPreferences,
  result,
  loading,
  onRecalculate,
  onViewItineraryCard
}) => {
  const { theme } = useData();
  const isLight = theme === 'light';

  const handlePreset = (presetName: string) => {
    switch (presetName) {
      case 'foodie':
        setPreferences({ stay: 1.0, food: 2.2, transport: 1.0, activities: 1.2 });
        break;
      case 'luxury':
        setPreferences({ stay: 2.5, food: 1.5, transport: 1.5, activities: 1.2 });
        break;
      case 'budget':
        setPreferences({ stay: 0.7, food: 1.0, transport: 0.8, activities: 1.8 });
        break;
      case 'balanced':
      default:
        setPreferences({ stay: 1.0, food: 1.0, transport: 1.0, activities: 1.0 });
        break;
    }
  };

  return (
    <div className={`rounded-3xl p-6 sm:p-8 space-y-8 border shadow-2xl font-sans transition-colors duration-500 ${
      isLight ? 'bg-white border-[#E5DEC9] text-[#231F1D]' : 'bg-[#14100c] border-amber-950/60 text-white'
    }`}>
      
      {/* Header */}
      <div className={`flex items-center justify-between border-b pb-5 ${
        isLight ? 'border-[#E5DEC9]' : 'border-amber-950/40'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <Sliders className={`w-5 h-5 ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`} />
            <h3 className={`text-xl font-bold font-serif ${isLight ? 'text-[#231F1D]' : 'text-white'}`}>Bộ Dự Toán Chi Phí Du Lịch</h3>
          </div>
          <p className={`text-xs mt-1 font-sans ${isLight ? 'text-[#665E55]' : 'text-slate-400'}`}>
            Kéo thanh trượt để tùy chỉnh phân bổ chi phí du lịch theo mong muốn của bạn
          </p>
        </div>
      </div>

      {/* Preset Travel Style Buttons */}
      <div className="space-y-2 font-sans">
        <label className={`text-xs font-bold uppercase tracking-[0.2em] ${isLight ? 'text-[#8A8075]' : 'text-slate-400'}`}>
          Phong Cách Chuyến Đi:
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handlePreset('foodie')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-[#FAF7F2] hover:bg-[#B8860B] hover:text-white text-[#B8860B] border-[#B8860B]/40'
                : 'bg-[#0C0805] hover:bg-[#d4af37] hover:text-[#0C0805] text-[#d4af37] border-[#d4af37]/40'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            Tín Đồ Ẩm Thực
          </button>

          <button
            onClick={() => handlePreset('luxury')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-[#FAF7F2] hover:bg-sky-500 hover:text-white text-sky-600 border-sky-300'
                : 'bg-[#0C0805] hover:bg-sky-400 hover:text-[#0C0805] text-sky-400 border-sky-500/40'
            }`}
          >
            <Hotel className="w-3.5 h-3.5" />
            Nghỉ Dưỡng Cao Cấp
          </button>

          <button
            onClick={() => handlePreset('budget')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-[#FAF7F2] hover:bg-emerald-600 hover:text-white text-emerald-600 border-emerald-300'
                : 'bg-[#0C0805] hover:bg-emerald-400 hover:text-[#0C0805] text-emerald-400 border-emerald-500/40'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            Tiết Kiệm
          </button>

          <button
            onClick={() => handlePreset('balanced')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isLight
                ? 'bg-[#FAF7F2] hover:bg-[#231F1D] hover:text-white text-[#4A4238] border-[#D4C5A9]'
                : 'bg-[#0C0805] hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            Cân Bằng
          </button>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 font-sans">
        
        {/* Total Budget Slider */}
        <div className={`space-y-2 p-4 rounded-2xl border ${
          isLight ? 'bg-[#FAF7F2] border-[#E5DEC9]' : 'bg-[#0C0805] border-amber-950/40'
        }`}>
          <div className="flex justify-between items-center text-xs">
            <span className={`font-bold ${isLight ? 'text-[#4A4238]' : 'text-slate-300'}`}>Tổng Ngân Sách:</span>
            <span className={`font-extrabold text-sm ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`}>{totalBudget.toLocaleString('vi-VN')} VNĐ</span>
          </div>
          <input
            type="range"
            min="2000000"
            max="40000000"
            step="500000"
            value={totalBudget}
            onChange={(e) => setTotalBudget(Number(e.target.value))}
            className="w-full accent-[#B8860B] h-2 rounded-lg cursor-pointer bg-slate-300 dark:bg-slate-900"
          />
          <div className={`flex justify-between text-[10px] ${isLight ? 'text-[#8A8075]' : 'text-slate-500'}`}>
            <span>2.000.000 đ</span>
            <span>40.000.000 đ</span>
          </div>
        </div>

        {/* Duration Slider */}
        <div className={`space-y-2 p-4 rounded-2xl border ${
          isLight ? 'bg-[#FAF7F2] border-[#E5DEC9]' : 'bg-[#0C0805] border-amber-950/40'
        }`}>
          <div className="flex justify-between items-center text-xs">
            <span className={`font-bold ${isLight ? 'text-[#4A4238]' : 'text-slate-300'}`}>Thời Gian Du Lịch:</span>
            <span className={`font-extrabold text-sm ${isLight ? 'text-[#231F1D]' : 'text-white'}`}>{numDays} Ngày</span>
          </div>
          <input
            type="range"
            min="1"
            max="14"
            step="1"
            value={numDays}
            onChange={(e) => setNumDays(Number(e.target.value))}
            className="w-full accent-[#231F1D] dark:accent-white h-2 rounded-lg cursor-pointer bg-slate-300 dark:bg-slate-900"
          />
          <div className={`flex justify-between text-[10px] ${isLight ? 'text-[#8A8075]' : 'text-slate-500'}`}>
            <span>1 ngày</span>
            <span>14 ngày</span>
          </div>
        </div>

      </div>

      {/* Category Preference Weights */}
      <div className="space-y-4 pt-2 font-sans">
        <h4 className={`text-xs font-bold uppercase tracking-[0.2em] ${isLight ? 'text-[#8A8075]' : 'text-slate-400'}`}>Ưu Tiên Chi Tiêu:</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Stay */}
          <div className={`space-y-1.5 p-3 rounded-xl border ${
            isLight ? 'bg-[#FAF7F2] border-sky-200' : 'bg-[#0C0805] border-sky-900/30'
          }`}>
            <div className="flex justify-between text-xs">
              <span className="text-sky-600 dark:text-sky-300 flex items-center gap-1 font-bold">
                <Hotel className="w-3.5 h-3.5" /> Lưu Trú
              </span>
              <span className="font-extrabold text-sky-600 dark:text-sky-400">{preferences.stay.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={preferences.stay}
              onChange={(e) => setPreferences(prev => ({ ...prev, stay: Number(e.target.value) }))}
              className="w-full accent-sky-500 h-1.5 rounded-lg cursor-pointer bg-slate-300 dark:bg-slate-900"
            />
          </div>

          {/* Food */}
          <div className={`space-y-1.5 p-3 rounded-xl border ${
            isLight ? 'bg-[#FAF7F2] border-amber-200' : 'bg-[#0C0805] border-amber-900/30'
          }`}>
            <div className="flex justify-between text-xs">
              <span className={`${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'} flex items-center gap-1 font-bold`}>
                <Utensils className="w-3.5 h-3.5" /> Ẩm Thực
              </span>
              <span className={`font-extrabold ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`}>{preferences.food.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={preferences.food}
              onChange={(e) => setPreferences(prev => ({ ...prev, food: Number(e.target.value) }))}
              className="w-full accent-[#B8860B] h-1.5 rounded-lg cursor-pointer bg-slate-300 dark:bg-slate-900"
            />
          </div>

          {/* Transport */}
          <div className={`space-y-1.5 p-3 rounded-xl border ${
            isLight ? 'bg-[#FAF7F2] border-purple-200' : 'bg-[#0C0805] border-purple-900/30'
          }`}>
            <div className="flex justify-between text-xs">
              <span className="text-purple-600 dark:text-purple-300 flex items-center gap-1 font-bold">
                <Car className="w-3.5 h-3.5" /> Di Chuyển
              </span>
              <span className="font-extrabold text-purple-600 dark:text-purple-400">{preferences.transport.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={preferences.transport}
              onChange={(e) => setPreferences(prev => ({ ...prev, transport: Number(e.target.value) }))}
              className="w-full accent-purple-500 h-1.5 rounded-lg cursor-pointer bg-slate-300 dark:bg-slate-900"
            />
          </div>

          {/* Activities */}
          <div className={`space-y-1.5 p-3 rounded-xl border ${
            isLight ? 'bg-[#FAF7F2] border-emerald-200' : 'bg-[#0C0805] border-emerald-900/30'
          }`}>
            <div className="flex justify-between text-xs">
              <span className="text-emerald-600 dark:text-emerald-300 flex items-center gap-1 font-bold">
                <Ticket className="w-3.5 h-3.5" /> Vé Tham Quan
              </span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{preferences.activities.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={preferences.activities}
              onChange={(e) => setPreferences(prev => ({ ...prev, activities: Number(e.target.value) }))}
              className="w-full accent-emerald-500 h-1.5 rounded-lg cursor-pointer bg-slate-300 dark:bg-slate-900"
            />
          </div>

        </div>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 font-sans">
        <button
          onClick={onRecalculate}
          disabled={loading}
          className={`py-3.5 px-4 font-bold text-xs uppercase tracking-[0.15em] rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md border ${
            isLight 
              ? 'bg-[#FAF7F2] hover:bg-[#F4F0E8] text-[#231F1D] border-[#D4C5A9]' 
              : 'bg-[#0C0805] hover:bg-[#1a140f] text-slate-200 border-amber-950/80 hover:border-[#d4af37]/50'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'} ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Đang Tính Toán...' : 'Cập Nhật Dự Toán'}</span>
        </button>

        {/* XEM KẾ HOẠCH BUTTON */}
        <button
          onClick={onViewItineraryCard}
          className={`py-3.5 px-4 font-extrabold text-xs uppercase tracking-[0.15em] rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95 ${
            isLight
              ? 'bg-[#B8860B] hover:bg-[#9E7B1A] text-white'
              : 'bg-[#d4af37] hover:bg-amber-400 text-[#0C0805]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Xem Kế Hoạch</span>
        </button>
      </div>

    </div>
  );
};
