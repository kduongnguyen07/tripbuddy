import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Wallet, Hotel, Utensils, Ticket, CheckCircle2, TrendingUp, Users } from 'lucide-react';
import { BudgetOverview, MaterializedPlan } from '../../types';
import { useData } from '../../context/DataContext';

interface BudgetDashboardProps {
  plan: MaterializedPlan;
}

export const BudgetDashboard: React.FC<BudgetDashboardProps> = ({ plan }) => {
  const { theme } = useData();
  const isLight = theme === 'light';

  if (!plan.budget) return null;

  const budget = plan.budget;
  const stay = budget.allocations.stay;
  const food = budget.allocations.food;
  const activity = budget.allocations.activity;

  return (
    <div
      className={`rounded-3xl p-6 sm:p-8 space-y-6 border shadow-xl font-sans transition-colors duration-500 ${
        isLight
          ? 'bg-white border-[#E5DEC9] text-[#231F1D]'
          : 'bg-[#14100c] border-amber-950/60 text-white'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-950/40 pb-4">
        <div className="flex items-center gap-2">
          <PieChart className="w-5 h-5 text-[#d4af37]" />
          <h3 className="text-xl font-bold font-serif">Dashboard Phân Tích Ngân Sách</h3>
        </div>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30">
          Tối Ưu Bằng Thuật Toán ILP
        </span>
      </div>

      {/* Main Numbers Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Budget */}
        <div className={`p-4 rounded-2xl border space-y-1 ${
          isLight
            ? 'bg-[#FAF7F2] border-[#E5DEC9]'
            : 'bg-[#0C0805] border-amber-950/40'
        }`}>
          <span className={`text-[11px] font-bold block flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <Wallet className={`w-3.5 h-3.5 ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`} /> Tổng Ngân Sách
          </span>
          <span className={`text-lg font-black block font-serif ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`}>
            {budget.total_vnd.toLocaleString('vi-VN')} đ
          </span>
        </div>

        {/* Allocated Amount */}
        <div className={`p-4 rounded-2xl border space-y-1 ${
          isLight
            ? 'bg-[#FAF7F2] border-[#E5DEC9]'
            : 'bg-[#0C0805] border-amber-950/40'
        }`}>
          <span className={`text-[11px] font-bold block flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Đã Phân Bổ
          </span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block font-serif">
            {budget.allocated_vnd.toLocaleString('vi-VN')} đ
          </span>
        </div>

        {/* Remaining Amount */}
        <div className={`p-4 rounded-2xl border space-y-1 ${
          isLight
            ? 'bg-[#FAF7F2] border-[#E5DEC9]'
            : 'bg-[#0C0805] border-amber-950/40'
        }`}>
          <span className={`text-[11px] font-bold block flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <TrendingUp className="w-3.5 h-3.5 text-sky-500" /> Ngân Sách Dư
          </span>
          <span className="text-lg font-black text-sky-600 dark:text-sky-400 block font-serif">
            {budget.remaining_vnd.toLocaleString('vi-VN')} đ
          </span>
        </div>

        {/* Per Person */}
        <div className={`p-4 rounded-2xl border space-y-1 ${
          isLight
            ? 'bg-[#FAF7F2] border-[#E5DEC9]'
            : 'bg-[#0C0805] border-amber-950/40'
        }`}>
          <span className={`text-[11px] font-bold block flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <Users className="w-3.5 h-3.5 text-purple-500" /> Bình Quân / Người
          </span>
          <span className="text-lg font-black text-purple-600 dark:text-purple-400 block font-serif">
            {budget.per_person_vnd.toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>

      {/* Visual Spending Allocation Progress Bar */}
      <div className="space-y-2 pt-2">
        <div className="flex justify-between items-center text-xs font-bold">
          <span>Tỷ Lệ Phân Bổ Chi Tiêu Theo Hạng Mục</span>
          <span className="text-slate-400">100% Tổng Chi Phí</span>
        </div>

        <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${stay.percentage}%` }}
            className="bg-sky-400 h-full transition-all duration-500"
            title={`Lưu trú: ${stay.percentage}%`}
          />
          <div
            style={{ width: `${food.percentage}%` }}
            className="bg-[#d4af37] h-full transition-all duration-500"
            title={`Ẩm thực: ${food.percentage}%`}
          />
          <div
            style={{ width: `${activity.percentage}%` }}
            className="bg-emerald-400 h-full transition-all duration-500"
            title={`Tham quan: ${activity.percentage}%`}
          />
        </div>

        {/* Category Legend Cards */}
        <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
          {/* Stay */}
          <div className="bg-[#0C0805] p-3 rounded-xl border border-sky-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-sky-400" />
              <div>
                <span className="font-bold text-sky-400 block">Lưu Trú</span>
                <span className="text-[10px] text-slate-400">{stay.percentage}%</span>
              </div>
            </div>
            <span className="font-extrabold text-sky-300">
              {stay.amount_vnd.toLocaleString('vi-VN')} đ
            </span>
          </div>

          {/* Food */}
          <div className="bg-[#0C0805] p-3 rounded-xl border border-amber-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#d4af37]" />
              <div>
                <span className="font-bold text-[#d4af37] block">Ẩm Thực</span>
                <span className="text-[10px] text-slate-400">{food.percentage}%</span>
              </div>
            </div>
            <span className="font-extrabold text-[#d4af37]">
              {food.amount_vnd.toLocaleString('vi-VN')} đ
            </span>
          </div>

          {/* Activity */}
          <div className="bg-[#0C0805] p-3 rounded-xl border border-emerald-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <div>
                <span className="font-bold text-emerald-400 block">Hoạt Động</span>
                <span className="text-[10px] text-slate-400">{activity.percentage}%</span>
              </div>
            </div>
            <span className="font-extrabold text-emerald-300">
              {activity.amount_vnd.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
