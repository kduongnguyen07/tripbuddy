import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Clock,
  Tag,
  ExternalLink,
  RefreshCw,
  Info,
  CheckCircle2,
  MapPin,
  Sparkles,
  DollarSign,
  Compass,
  Image as ImageIcon,
} from 'lucide-react';
import { PlanServiceItem, PlanSelection } from '../../types';

interface ActivityInspectionPanelProps {
  service: PlanServiceItem | null;
  destinationName?: string;
  onOpenSwapModal?: () => void;
}

export const ActivityInspectionPanel: React.FC<ActivityInspectionPanelProps> = ({
  service,
  destinationName,
  onOpenSwapModal,
}) => {
  if (!service) {
    return (
      <div className="p-8 rounded-3xl bg-[#0C0805] border border-amber-950/60 text-center space-y-3 font-sans">
        <Compass className="w-10 h-10 text-[#d4af37] mx-auto animate-pulse" />
        <h4 className="font-extrabold text-sm text-white font-serif">
          Xem Chi Tiết Hoạt Động
        </h4>
        <p className="text-xs text-slate-400">
          Bấm vào bất kỳ địa điểm hoặc hoạt động nào trên Timeline bên phải để xem hình ảnh minh họa & thông tin bổ sung chi tiết tại đây.
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={service.id}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl bg-[#0C0805] border-2 border-[#d4af37]/60 overflow-hidden shadow-2xl space-y-0 font-sans"
      >
        {/* Large High-Res Hero Image Illustration */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden group">
          <img
            src={service.image_url}
            alt={service.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C0805] via-black/20 to-transparent" />

          {/* Badges Overlay */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
            <span className="px-3 py-1 rounded-full bg-[#0C0805]/80 backdrop-blur-md border border-[#d4af37]/40 text-[#d4af37] font-extrabold text-xs uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
              <ImageIcon className="w-3.5 h-3.5" />
              {service.category === 'stay'
                ? 'Nơi Lưu Trú'
                : service.category === 'food'
                ? 'Ẩm Thực'
                : 'Tham Quan / Vui Chơi'}
            </span>

            <span className="px-3 py-1 rounded-full bg-[#0C0805]/80 backdrop-blur-md border border-amber-400/40 text-amber-400 font-extrabold text-xs flex items-center gap-1 shadow-lg">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {service.rating} / 5.0
            </span>
          </div>

          {/* Bottom Title Overlay */}
          <div className="absolute bottom-4 left-4 right-4 space-y-1">
            <span className="text-[11px] font-extrabold text-[#d4af37] uppercase tracking-wider block flex items-center gap-1 font-sans">
              <Clock className="w-3.5 h-3.5" />
              {service.start_time || '08:00'} – {service.end_time || '10:00'} ({service.time_window})
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white font-serif drop-shadow-md">
              {service.name}
            </h3>
          </div>
        </div>

        {/* Detailed Supplemental Info Section */}
        <div className="p-6 space-y-5 bg-[#0C0805]">
          {/* Price Stat Box */}
          <div className="p-4 rounded-2xl bg-[#14100c] border border-amber-950/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-extrabold">
                {service.price_unit === 'per_room' ? 'Chi Phí Lưu Trú / Đêm' : 'Chi Phí Dự Tính'}
              </span>
              <span className="text-lg font-black text-[#d4af37] font-serif">
                {(service.display_cost_vnd || service.total_cost_vnd) === 0
                  ? 'Miễn Phí Vé Vào Cửa'
                  : `${(service.display_cost_vnd || service.total_cost_vnd).toLocaleString('vi-VN')} VNĐ`}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-slate-300 block">
                Thời gian: {service.duration_hours} giờ
              </span>
              <span className="text-[10px] text-slate-400">
                Điểm đến: {destinationName || 'Việt Nam'}
              </span>
            </div>
          </div>

          {/* Classification Tags */}
          <div className="space-y-2">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#d4af37]" /> Thẻ Nhãn Đặc Trưng:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {service.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-xl bg-[#14100c] border border-amber-950/60 text-xs font-bold text-slate-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Supplemental Info Notes */}
          <div className="space-y-2.5 pt-3 border-t border-amber-950/40">
            <span className="text-xs font-extrabold text-sky-400 uppercase tracking-widest block flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-400" /> Thông Tin Bổ Sung & Kinh Nghiệm:
            </span>

            <div className="text-xs text-slate-300 space-y-2 font-sans leading-relaxed">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Địa điểm nằm trong danh sách trải nghiệm hàng đầu với đánh giá chất lượng <strong className="text-white">{service.rating}/5.0 sao</strong>.
                </span>
              </p>

              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <span>
                  Khung giờ vàng thích hợp nhất: <strong className="text-[#d4af37]">{service.start_time || '08:00'} – {service.end_time || '10:00'}</strong> (tránh đông đúc và tối ưu trải nghiệm chụp ảnh).
                </span>
              </p>

              {service.category === 'stay' && (
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>Hỗ trợ đặt phòng trực tuyến nhanh chóng với ưu đãi đối tác OTA.</span>
                </p>
              )}
            </div>
          </div>

          {/* Action Row Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-amber-950/40">
            {onOpenSwapModal && (
              <button
                onClick={onOpenSwapModal}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-[#d4af37] hover:text-[#0C0805] text-slate-200 text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-700 shadow-md"
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
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <span>Đặt Phòng / Xem Chi Tiết</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
