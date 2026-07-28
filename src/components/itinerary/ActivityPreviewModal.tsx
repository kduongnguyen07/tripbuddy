import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  Clock,
  MapPin,
  Tag,
  ExternalLink,
  RefreshCw,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { PlanServiceItem } from '../../types';
import { SafeImage } from '../common/SafeImage';


interface ActivityPreviewModalProps {

  isOpen: boolean;
  onClose: () => void;
  service: PlanServiceItem | null;
  onTriggerSwap?: () => void;
}

export const ActivityPreviewModal: React.FC<ActivityPreviewModalProps> = ({
  isOpen,
  onClose,
  service,
  onTriggerSwap,
}) => {
  if (!isOpen || !service) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#0C0805]/90 backdrop-blur-md z-[999998]"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 25 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-[#14100c] border-2 border-[#d4af37]/60 rounded-3xl overflow-hidden shadow-2xl z-[999999] my-auto text-white font-sans flex flex-col max-h-[88vh]"
        >
          {/* Large High-Res Image Header Preview */}
          <div className="relative h-64 sm:h-72 w-full overflow-hidden shrink-0">
            <SafeImage
              src={service.image_url}
              alt={service.name}
              fallbackTitle={service.name}
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#14100c] via-black/30 to-transparent" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#0C0805]/80 hover:bg-[#d4af37] hover:text-[#0C0805] text-white flex items-center justify-center border border-amber-950/60 backdrop-blur-md transition-all cursor-pointer shadow-xl z-10"
              title="Đóng xem trước"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Category & Rating Badges */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
              <span className="px-3 py-1 rounded-full bg-[#0C0805]/80 backdrop-blur-md border border-[#d4af37]/40 text-[#d4af37] font-extrabold text-xs uppercase tracking-widest">
                {service.category === 'stay'
                  ? 'Lưu Trú'
                  : service.category === 'food'
                  ? 'Ẩm Thực'
                  : 'Hoạt Động / Tham Quan'}
              </span>

              <span className="px-3 py-1 rounded-full bg-[#0C0805]/80 backdrop-blur-md border border-amber-400/40 text-amber-400 font-extrabold text-xs flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{' '}
                {service.rating} / 5.0
              </span>
            </div>
          </div>

          {/* Modal Content Details */}
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 bg-[#14100c]">
            {/* Title & Time Window */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#d4af37] font-bold">
                <Clock className="w-4 h-4" />
                <span>
                  Khung giờ đề xuất: {service.start_time || '08:00'} – {service.end_time || '10:00'} ({service.duration_hours}h)
                </span>
              </div>

              <h3 className="text-2xl font-extrabold text-white font-serif">
                {service.name}
              </h3>
            </div>

            {/* Price & Cost Stats Card */}
            <div className="p-4 rounded-2xl bg-[#0C0805] border border-amber-950/50 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block uppercase font-bold">
                  {service.price_unit === 'per_room' ? 'Đơn giá lưu trú / đêm' : 'Chi phí dự tính'}
                </span>
                <span className="text-xl font-black text-[#d4af37] font-serif">
                  {(service.display_cost_vnd || service.total_cost_vnd) === 0
                    ? 'Miễn Phí Tham Quan'
                    : `${(service.display_cost_vnd || service.total_cost_vnd).toLocaleString('vi-VN')} VNĐ`}
                </span>
              </div>

              <div className="text-right text-xs text-slate-300">
                <span className="block font-bold">Thời gian: {service.duration_hours} giờ</span>
                <span className="text-[10px] text-slate-500">Khung giờ: {service.time_window}</span>
              </div>
            </div>

            {/* Classification Tags */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#d4af37]" /> Thẻ Phân Loại Đặc Trưng:
              </span>
              <div className="flex flex-wrap gap-2">
                {service.tags.map((tag: string) => (

                  <span
                    key={tag}
                    className="px-3 py-1 rounded-xl bg-[#0C0805] border border-amber-950/60 text-xs font-bold text-slate-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Description Info */}
            <div className="space-y-2 pt-2 border-t border-amber-950/40">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-400" /> Thông Tin & Trải Nghiệm Tiêu Biểu:
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Được đánh giá cao bởi du khách với chất lượng dịch vụ đạt chuẩn {service.rating}/5.0 sao. Điểm đến phù hợp phong cách nghỉ dưỡng và trải nghiệm du lịch cá nhân hóa.
              </p>
            </div>

            {/* Modal Bottom Action Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-amber-950/40">
              {onTriggerSwap && (
                <button
                  onClick={() => {
                    onClose();
                    onTriggerSwap();
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-800 hover:bg-[#d4af37] hover:text-[#0C0805] text-slate-200 text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-700 shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Đổi Địa Điểm Khác</span>
                </button>
              )}

              {service.affiliate_url && (
                <a
                  href={service.affiliate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>Đặt Phòng / Xem Chi Tiết đối tác</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
