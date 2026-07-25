import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Star,
  RefreshCw,
  ExternalLink,
  Hotel,
  Utensils,
  Ticket,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import {
  MaterializedPlan,
  PlanServiceItem,
  PlanSelection,
} from '../../types';
import { ActivityPreviewModal } from './ActivityPreviewModal';
import { useData } from '../../context/DataContext';

interface ItineraryTimelineProps {
  plan: MaterializedPlan;
  onOpenSwapModal: (target: PlanSelection, service: PlanServiceItem) => void;
  onInspectService?: (service: PlanServiceItem, target: PlanSelection) => void;
  activeServiceId?: string;
}

const SLOT_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  overnight: { label: 'Lưu Trú Đêm', icon: Hotel, color: 'text-sky-400' },
  breakfast: { label: 'Ăn Sáng', icon: Utensils, color: 'text-amber-400' },
  morning: { label: 'Tham Quan Sáng', icon: Ticket, color: 'text-emerald-400' },
  lunch: { label: 'Ăn Trưa', icon: Utensils, color: 'text-amber-400' },
  afternoon: { label: 'Hoạt Động Chiều', icon: Ticket, color: 'text-purple-400' },
  dinner: { label: 'Ăn Tối', icon: Utensils, color: 'text-amber-400' },
  evening: { label: 'Trải Nghiệm Tối', icon: Ticket, color: 'text-indigo-400' },
};

export const ItineraryTimeline: React.FC<ItineraryTimelineProps> = ({
  plan,
  onOpenSwapModal,
  onInspectService,
  activeServiceId,
}) => {
  const { theme } = useData();
  const isLight = theme === 'light';

  // Preview Modal State for image illustration
  const [previewService, setPreviewService] = useState<PlanServiceItem | null>(null);
  const [previewTargetSelection, setPreviewTargetSelection] = useState<PlanSelection | null>(null);

  if (!plan.daily_itinerary || plan.daily_itinerary.length === 0) return null;

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-950/40 pb-4">
        <div>
          <h3 className="text-2xl font-extrabold text-white font-serif flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#d4af37]" />
            Timeline Lịch Trình Chi Tiết ({plan.trip?.num_days || plan.daily_itinerary.length} Ngày)
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Bấm vào bất kỳ địa điểm nào để xem <span className="text-[#d4af37] font-bold">hình ảnh minh họa & thông tin bổ sung bên trái</span>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300 font-bold bg-[#0C0805] p-3 rounded-2xl border border-amber-950/50">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Đã kiểm tra không trùng lặp khung giờ</span>
        </div>
      </div>

      {/* Mandatory Disclaimer Note Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-3 shadow-xl">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
        <span>Lưu ý: Lịch trình này chưa bao gồm chi phí di chuyển và các chi phí phát sinh khác.</span>
      </div>

      {/* Days Grid */}
      <div className="space-y-8">
        {plan.daily_itinerary.map((dayPlan, idx) => (
          <motion.div
            key={dayPlan.day}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.05 }}
            className={`rounded-3xl p-6 sm:p-8 border shadow-2xl space-y-6 transition-colors duration-500 ${
              isLight
                ? 'bg-white border-[#E5DEC9] text-[#231F1D]'
                : 'bg-[#14100c] border-amber-950/60 text-white'
            }`}
          >
            {/* Day Header */}
            <div className="flex items-center justify-between border-b border-amber-950/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#d4af37] text-[#0C0805] font-black text-base flex items-center justify-center shadow-lg font-sans">
                  N{dayPlan.day}
                </div>
                <div>
                  <h4 className="font-extrabold text-lg font-serif">
                    Ngày {dayPlan.day}: Khám Phá {plan.destination?.name?.split('-')[0].trim()}
                  </h4>
                  <span className="text-xs text-slate-400 font-sans">
                    5 hoạt động & bữa ăn được lên lịch
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase font-sans">
                  Tổng chi phí Ngày {dayPlan.day}
                </span>
                <span className="font-black text-[#d4af37] text-base font-serif">
                  {dayPlan.total_cost_vnd.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Time Slot Events List */}
            <div className="space-y-4">
              {dayPlan.events.map((event) => {
                const slotInfo = SLOT_LABELS[event.slot || 'morning'] || {
                  label: event.slot,
                  icon: Ticket,
                  color: 'text-emerald-400',
                };
                const IconComponent = slotInfo.icon;
                const selectionTarget: PlanSelection = {
                  service_id: event.id,
                  day: dayPlan.day,
                  slot: event.slot || 'morning',
                };
                const isSelected = activeServiceId === event.id;

                const handleItemClick = () => {
                  if (onInspectService) {
                    onInspectService(event, selectionTarget);
                  } else {
                    setPreviewService(event);
                    setPreviewTargetSelection(selectionTarget);
                  }
                };

                return (
                  <div
                    key={`${event.id}_${event.slot}`}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer ${
                      isSelected
                        ? 'bg-[#1a140f] border-[#d4af37] ring-2 ring-[#d4af37]/60 shadow-xl'
                        : 'bg-[#0C0805] border-amber-950/40 hover:border-[#d4af37]/60'
                    }`}
                  >
                    {/* Time & Slot Indicator + Click to inspect Activity */}
                    <div
                      onClick={handleItemClick}
                      className="flex items-start sm:items-center gap-3 flex-1"
                    >
                      <div className="w-20 shrink-0 text-left">
                        <span className="text-xs font-bold text-[#d4af37] flex items-center gap-1 font-sans">
                          <Clock className="w-3.5 h-3.5" />
                          {event.start_time || '08:00'}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          đến {event.end_time || '09:00'}
                        </span>
                      </div>

                      {/* Item Image Illustration Thumbnail with Hover Eye Icon */}
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-amber-950/50 shrink-0 group-hover:scale-105 transition-transform duration-300">
                        <img
                          src={event.image_url}
                          alt={event.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className="w-4 h-4 text-[#d4af37]" />
                        </div>
                      </div>

                      {/* Content Info */}
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`text-[11px] font-extrabold flex items-center gap-1 ${slotInfo.color}`}
                          >
                            <IconComponent className="w-3.5 h-3.5" />
                            {slotInfo.label}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-amber-400 font-bold text-xs flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400" /> {event.rating}
                          </span>
                        </div>

                        <h5 className="font-bold text-sm text-white font-serif group-hover:text-[#d4af37] transition-colors">
                          {event.name}
                        </h5>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {event.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Price & Action Buttons */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 border-amber-950/40 pt-3 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">
                          {event.price_unit === 'per_room' ? 'Chi phí / đêm' : 'Chi phí'}
                        </span>
                        <span className="font-black text-sm text-[#d4af37] font-serif">
                          {(event.display_cost_vnd || event.total_cost_vnd) === 0
                            ? 'Miễn Phí'
                            : `${(event.display_cost_vnd || event.total_cost_vnd).toLocaleString('vi-VN')} đ`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Swap Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSwapModal(selectionTarget, event);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-[#d4af37] hover:text-[#0C0805] text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm border border-slate-700"
                          title="Đổi địa điểm khác"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Đổi</span>
                        </button>

                        {/* Affiliate Booking Button (if accommodation / partner link available) */}
                        {event.affiliate_url && (
                          <a
                            href={event.affiliate_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                          >
                            <span>Đặt Phòng</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Activity Image & Details Preview Modal (Fallback if onInspectService not provided) */}
      {previewService && !onInspectService && (
        <ActivityPreviewModal
          isOpen={!!previewService}
          onClose={() => setPreviewService(null)}
          service={previewService}
          onTriggerSwap={() => {
            if (previewTargetSelection && previewService) {
              onOpenSwapModal(previewTargetSelection, previewService);
            }
          }}
        />
      )}
    </div>
  );
};
