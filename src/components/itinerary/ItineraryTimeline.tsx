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
import { SafeImage } from '../common/SafeImage';

interface ItineraryTimelineProps {
  plan: MaterializedPlan;
  onOpenSwapModal: (target: PlanSelection, service: PlanServiceItem) => void;
  onInspectService?: (service: PlanServiceItem, target: PlanSelection) => void;
  activeServiceId?: string;
}

const SLOT_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  overnight: { label: 'Lưu Trú Đêm', icon: Hotel, color: 'text-sky-400 font-extrabold' },
  check_in: { label: 'Check-in Nhận Phòng (14:00)', icon: Hotel, color: 'text-emerald-400 font-black' },
  check_out: { label: 'Check-out Trả Phòng (12:00)', icon: Hotel, color: 'text-amber-400 font-black' },
  breakfast: { label: 'Ăn Sáng', icon: Utensils, color: 'text-amber-400' },
  morning: { label: 'Tham Quan Sáng', icon: Ticket, color: 'text-emerald-400' },
  lunch: { label: 'Ăn Trưa', icon: Utensils, color: 'text-amber-400' },
  afternoon: { label: 'Hoạt Động Chiều', icon: Ticket, color: 'text-purple-400' },
  dinner: { label: 'Ăn Tối', icon: Utensils, color: 'text-amber-400' },
  evening: { label: 'Trải Nghiệm Tối', icon: Ticket, color: 'text-indigo-400' },
};

const formatDistance = (distance: number): string => {
  const formatted = distance.toFixed(1).replace(/\.0$/, '');
  return `Khoảng cách: ${formatted} Km`;
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
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${isLight ? 'border-[#E5DEC9]' : 'border-amber-950/40'}`}>
        <div>
          <h3 className={`text-2xl font-extrabold font-serif flex items-center gap-2 ${isLight ? 'text-[#231F1D]' : 'text-white'}`}>
            <Calendar className={`w-6 h-6 ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`} />
            Timeline Lịch Trình Chi Tiết ({plan.trip?.num_days || plan.daily_itinerary.length} Ngày)
          </h3>
          <p className={`text-xs mt-1 font-sans ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Bấm vào bất kỳ địa điểm nào để xem <span className={`font-bold ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`}>hình ảnh minh họa & thông tin bổ sung bên trái</span>
          </p>
        </div>

        <div className={`flex items-center gap-2 text-xs font-bold p-3 rounded-2xl border ${
          isLight
            ? 'bg-white text-[#231F1D] border-[#E5DEC9]'
            : 'bg-[#0C0805] text-slate-300 border-amber-950/50'
        }`}>
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Đã kiểm tra không trùng lặp khung giờ</span>
        </div>
      </div>

      {/* Mandatory Disclaimer Note Banner */}
      <div className={`p-4 rounded-2xl border-2 text-xs font-bold flex items-center gap-3 shadow-md ${
        isLight
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-900'
          : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
      }`}>
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
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
            className={`rounded-3xl p-6 sm:p-8 border shadow-xl space-y-6 transition-colors duration-500 ${
              isLight
                ? 'bg-white border-[#E5DEC9] text-[#231F1D]'
                : 'bg-[#14100c] border-amber-950/60 text-white'
            }`}
          >
            {/* Day Header */}
            <div className={`flex items-center justify-between border-b pb-4 ${isLight ? 'border-[#E5DEC9]' : 'border-amber-950/40'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl font-black text-base flex items-center justify-center shadow-md font-sans ${
                  isLight ? 'bg-[#B8860B] text-white' : 'bg-[#d4af37] text-[#0C0805]'
                }`}>
                  N{dayPlan.day}
                </div>
                <div>
                  <h4 className={`font-extrabold text-lg font-serif ${isLight ? 'text-[#231F1D]' : 'text-white'}`}>
                    Ngày {dayPlan.day}: Khám Phá {plan.destination?.name?.split('-')[0].trim()}
                  </h4>
                  <span className={`text-xs font-sans ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    5 hoạt động & bữa ăn được lên lịch
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className={`text-[10px] block uppercase font-sans ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Tổng chi phí Ngày {dayPlan.day}
                </span>
                <span className={`font-black text-base font-serif ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`}>
                  {dayPlan.total_cost_vnd.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Time Slot Events List */}
            <div className="space-y-4">
              {[...dayPlan.events]
                .sort((a, b) => {
                  const getMinutes = (item: PlanServiceItem) => {
                    if (item.slot === 'overnight') return 0;
                    if (item.slot === 'check_out') return 1200;
                    if (item.slot === 'check_in') return 1400;
                    
                    if (item.start_time && item.start_time.includes(':')) {
                      const parts = item.start_time.split(':').map(Number);
                      return (parts[0] || 0) * 100 + (parts[1] || 0);
                    }
                    const weights: Record<string, number> = {
                      breakfast: 800,
                      morning: 930,
                      check_out: 1200,
                      lunch: 1230,
                      check_in: 1400,
                      afternoon: 1430,
                      dinner: 1900,
                      evening: 2030,
                    };
                    return weights[item.slot || ''] || 1000;
                  };
                  return getMinutes(a) - getMinutes(b);
                })
                .map((event) => {

                const slotInfo = SLOT_LABELS[event.slot || 'morning'] || {
                  label: event.slot,
                  icon: Ticket,
                  color: 'text-emerald-500',
                };
                const IconComponent = slotInfo.icon;
                const selectionTarget: PlanSelection = {
                  service_id: event.id,
                  day: event.slot === 'overnight' ? 0 : dayPlan.day,
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
                        ? isLight
                          ? 'bg-[#F5EFE6] border-[#B8860B] ring-2 ring-[#B8860B]/60 shadow-md'
                          : 'bg-[#1a140f] border-[#d4af37] ring-2 ring-[#d4af37]/60 shadow-xl'
                        : isLight
                        ? 'bg-[#FAF7F2] border-[#E5DEC9] hover:border-[#B8860B]/60'
                        : 'bg-[#0C0805] border-amber-950/40 hover:border-[#d4af37]/60'
                    }`}
                  >
                    {/* Time & Slot Indicator */}
                    <div
                      onClick={handleItemClick}
                      className="flex items-start sm:items-center gap-3 flex-1"
                    >
                      {/* Hide 08:00-09:00 clock only for the main Overnight stay card */}
                      {event.slot === 'overnight' ? (
                        <div className="w-36 shrink-0 text-left">
                          <span className={`text-xs font-bold flex items-center gap-1 font-sans ${isLight ? 'text-sky-600' : 'text-sky-400'}`}>
                            <Hotel className="w-3.5 h-3.5" />
                            Lưu Trú
                          </span>
                          <span className={`text-[10px] font-bold block ${isLight ? 'text-sky-700' : 'text-sky-300'}`}>
                            🌙 Cả ngày
                          </span>
                          {typeof event.distance_from_previous_km === 'number' && (
                            <span className={`text-[10px] block whitespace-nowrap ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                              {formatDistance(event.distance_from_previous_km)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-36 shrink-0 text-left">
                          <span className={`text-xs font-bold flex items-center gap-1 font-sans ${
                            event.slot === 'check_out' ? 'text-amber-500' : event.slot === 'check_in' ? 'text-emerald-500' : isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'
                          }`}>
                            <Clock className="w-3.5 h-3.5" />
                            {event.start_time || (event.slot === 'check_out' ? '12:00' : event.slot === 'check_in' ? '14:00' : '08:00')}
                          </span>
                          <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                            đến {event.end_time || (event.slot === 'check_out' ? '12:30' : event.slot === 'check_in' ? '14:30' : '09:00')}
                          </span>
                          {typeof event.distance_from_previous_km === 'number' && (
                            <span className={`text-[10px] block whitespace-nowrap ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                              {formatDistance(event.distance_from_previous_km)}
                            </span>
                          )}
                        </div>
                      )}



                      {/* Item Image Illustration Thumbnail with Hover Eye Icon */}
                      <div className={`relative w-16 h-16 rounded-2xl overflow-hidden border shrink-0 group-hover:scale-105 transition-transform duration-300 ${
                        isLight ? 'border-[#E5DEC9]' : 'border-amber-950/50'
                      }`}>
                        <SafeImage
                          src={event.image_url}
                          alt={event.name}
                          fallbackTitle={event.name}
                          className="w-full h-full object-cover"
                        />

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className={`w-4 h-4 ${isLight ? 'text-amber-300' : 'text-[#d4af37]'}`} />
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
                          <span className={isLight ? 'text-slate-400' : 'text-slate-600'}>•</span>
                          <span className="text-amber-500 font-bold text-xs flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" /> {event.rating}
                          </span>
                        </div>

                        <h5 className={`font-bold text-sm font-serif transition-colors ${
                          isLight ? 'text-[#231F1D] group-hover:text-[#B8860B]' : 'text-white group-hover:text-[#d4af37]'
                        }`}>
                          {event.name}
                        </h5>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {event.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`px-2 py-0.5 rounded-full text-[10px] ${
                                isLight ? 'bg-amber-100/70 text-amber-900 border border-amber-200' : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Price & Action Buttons */}
                    <div className={`flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 ${
                      isLight ? 'border-[#E5DEC9]' : 'border-amber-950/40'
                    }`}>
                      <div className="text-left sm:text-right">
                        <span className={`text-[10px] block uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {event.price_unit === 'per_room' ? 'Chi phí / đêm' : 'Chi phí'}
                        </span>
                        <span className={`font-black text-sm font-serif ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`}>
                          {(event.display_cost_vnd || event.total_cost_vnd) === 0
                            ? 'Miễn Phí'
                            : `${(event.display_cost_vnd || event.total_cost_vnd).toLocaleString('vi-VN')} đ`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Swap Button (Hidden for fixed check-in/out procedures) */}
                        {event.slot !== 'check_in' && event.slot !== 'check_out' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenSwapModal(selectionTarget, event);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm border ${
                              isLight
                                ? 'bg-white hover:bg-[#B8860B] hover:text-white text-[#231F1D] border-[#E5DEC9]'
                                : 'bg-slate-800 hover:bg-[#d4af37] hover:text-[#0C0805] text-slate-300 border-slate-700'
                            }`}
                            title="Đổi địa điểm khác"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Đổi</span>
                          </button>
                        )}


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
