import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Star, Clock, ChevronRight, Sparkles, Compass } from 'lucide-react';



import { Destination } from '../../types';
import { SafeImage } from '../common/SafeImage';

interface ModalProps {
  destination: Destination | null;
  onClose: () => void;
  onSelectForPlanning: (dest: Destination) => void;
}

export const DestinationDetailModal: React.FC<ModalProps> = ({
  destination,
  onClose,
  onSelectForPlanning
}) => {
  if (!destination) return null;

  const scores = destination.satisfaction_scores || { stay: 9.0, food: 9.0, activities: 9.0, transport: 9.0 };
  const rating = (((scores.stay || 9.0) + (scores.food || 9.0) + (scores.activities || 9.0)) / 3).toFixed(1);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        
        {/* Backdrop Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#0C0805]/90 backdrop-blur-md"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full max-w-4xl bg-[#14100c] border border-amber-950/80 rounded-3xl overflow-hidden shadow-2xl z-10 my-auto text-white font-sans max-h-[90vh] flex flex-col"
        >
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-[#0C0805]/80 hover:bg-[#d4af37] hover:text-[#0C0805] text-white flex items-center justify-center border border-amber-950/60 transition-all cursor-pointer shadow-lg"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header Cover Image */}
          <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-[#0C0805] shrink-0">
            <SafeImage
              src={destination.hero_image}
              alt={destination.name}
              fallbackTitle={destination.name.split('-')[0].trim()}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#14100c] via-[#14100c]/40 to-transparent" />

            {/* Region Tag & Rating */}
            <div className="absolute top-6 left-6 flex items-center gap-3">
              <span className="bg-[#0C0805]/90 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-slate-200 border border-slate-700 shadow-md">
                {destination.region}
              </span>
              <div className="bg-[#0C0805]/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#d4af37] flex items-center gap-1 border border-[#d4af37]/40 shadow-md">
                <Star className="w-3.5 h-3.5 fill-[#d4af37]" />
                <span>{rating} / 10</span>
              </div>
            </div>

            {/* Destination Title on Cover */}
            <div className="absolute bottom-6 left-6 right-6 space-y-1">
              <h2 className="text-3xl sm:text-5xl font-bold font-serif text-white tracking-tight">
                {destination.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#d4af37] font-bold">
                <MapPin className="w-4 h-4" />
                <span>Tọa độ: {destination.coordinates[1]}°N, {destination.coordinates[0]}°E</span>
              </div>
            </div>
          </div>

          {/* Scrollable Modal Content */}
          <div className="p-6 sm:p-8 space-y-8 overflow-y-auto flex-1">
            
            {/* Score Breakdown Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#0C0805] border border-amber-950/40 text-center">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-[0.2em]">Lưu Trú</span>
                <span className="text-lg font-extrabold text-sky-400">{destination.satisfaction_scores.stay} / 10</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-[0.2em]">Ẩm Thực</span>
                <span className="text-lg font-extrabold text-[#d4af37]">{destination.satisfaction_scores.food} / 10</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-[0.2em]">Di Chuyển</span>
                <span className="text-lg font-extrabold text-purple-400">{destination.satisfaction_scores.transport} / 10</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-[0.2em]">Trải Nghiệm</span>
                <span className="text-lg font-extrabold text-emerald-400">{destination.satisfaction_scores.activities} / 10</span>
              </div>
            </div>

            {/* Activities & Tour Highlights */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold font-serif text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#d4af37]" />
                Hoạt Động Nổi Bật & Chi Phí Ước Tính
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {destination.activities.map((act) => (
                  <div 
                    key={act.id} 
                    className="p-4 rounded-2xl bg-[#0C0805] border border-amber-950/50 space-y-2 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="font-bold text-white text-sm block">{act.name}</span>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-[#d4af37]" />
                          <span>Thời gian: ~{act.duration_hrs} giờ</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-400 shrink-0">★ {act.score}</span>
                    </div>

                    <div className="pt-2 border-t border-amber-950/40 flex justify-between items-center text-xs">
                      <span className="text-slate-500">Chi phí vé/dịch vụ:</span>
                      <span className="font-extrabold text-[#d4af37]">
                        {act.cost === 0 ? 'Miễn Phí' : `${act.cost.toLocaleString('vi-VN')} đ`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Travel Tips & Recommendations */}
            <div className="p-5 rounded-2xl bg-[#0C0805] border border-amber-950/40 space-y-3">
              <h4 className="text-xs font-bold text-[#d4af37] uppercase tracking-[0.2em] flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#d4af37]" />
                Kinh Nghiệm Du Lịch & Gợi Ý Chuyến Đi
              </h4>
              <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                <li>Nên đặt vé máy bay và phòng khách sạn trước từ 2 - 3 tuần để nhận mức giá tối ưu nhất.</li>
                <li>Trải nghiệm ẩm thực đường phố địa phương tại các chợ đêm rực rỡ sắc màu.</li>
                <li>Dễ dàng tùy chỉnh ngân sách tổng và thời gian đi tại bộ công cụ tính toán lịch trình bên dưới.</li>
              </ul>
            </div>

          </div>

          {/* Modal Footer CTA */}
          <div className="p-6 bg-[#0C0805] border-t border-amber-950/60 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            <div>
              <span className="text-xs text-slate-400 block">Ước tính chi phí trung bình:</span>
              <span className="text-lg font-extrabold text-[#d4af37]">
                {(destination.satisfaction_scores.food * 400000).toLocaleString('vi-VN')} đ / ngày
              </span>
            </div>

            <button
              onClick={() => {
                onClose();
                onSelectForPlanning(destination);
              }}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#d4af37] hover:bg-amber-400 text-[#0C0805] font-extrabold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer"
            >
              <span>Lập Lịch Trình Cho Điểm Đến Này</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
