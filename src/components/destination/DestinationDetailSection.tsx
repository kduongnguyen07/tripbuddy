import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Star, Clock, Compass, Bookmark, ChevronRight, ChevronUp } from 'lucide-react';
import { Destination } from '../../types';
import { SafeImage } from '../common/SafeImage';
import { useData } from '../../context/DataContext';

interface DestinationDetailSectionProps {
  destination: Destination | null;
  onSelectForPlanning: (dest: Destination) => void;
  onClose: () => void;
}

export const DestinationDetailSection: React.FC<DestinationDetailSectionProps> = ({
  destination,
  onSelectForPlanning,
  onClose
}) => {
  const { theme } = useData();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'activities' | 'overview' | 'tips'>('activities');

  // Reset tab to activities whenever a new destination is selected
  useEffect(() => {
    setActiveTab('activities');
  }, [destination?.id]);

  if (!destination) return null;

  const scores = destination.satisfaction_scores || { stay: 9.0, food: 9.0, activities: 9.0, transport: 9.0 };
  const rating = (((scores.stay || 9.0) + (scores.food || 9.0) + (scores.activities || 9.0)) / 3).toFixed(1);

  return (
    <AnimatePresence mode="wait">
      <motion.section 
        key={destination.id} // Re-mount section animation on destination change
        id="destination-detail"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`py-16 px-8 max-w-7xl mx-auto space-y-10 font-sans scroll-mt-24 transition-colors duration-500 ${
          isLight ? 'bg-[#FAF7F2] text-[#231F1D]' : 'bg-[#0C0805] text-white'
        }`}
      >
        
        {/* Section Header Banner with refreshed cover image */}
        <div className={`relative rounded-3xl overflow-hidden border-2 shadow-2xl h-[360px] sm:h-[400px] shrink-0 flex flex-col justify-end p-8 ${
          isLight ? 'border-[#B8860B]/40 bg-slate-900' : 'border-[#d4af37]/40 bg-[#14100c]'
        }`}>
          <SafeImage
            key={`hero-${destination.id}`}
            src={destination.hero_image}
            alt={destination.name}
            fallbackTitle={destination.name.split('-')[0].trim()}
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C0805] via-[#0C0805]/40 to-transparent pointer-events-none" />

          {/* Top Badges */}
          <div className="absolute top-6 left-6 flex items-center gap-3 z-10">
            <span className="bg-[#0C0805]/85 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-slate-200 border border-slate-700 shadow-lg uppercase tracking-[0.2em]">
              {destination.region}
            </span>
            <div className="bg-[#0C0805]/85 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-[#d4af37] flex items-center gap-1 border border-[#d4af37]/40 shadow-lg">
              <Star className="w-3.5 h-3.5 fill-[#d4af37]" />
              <span>{rating} / 10</span>
            </div>
          </div>

          {/* Bottom Banner Content */}
          <div className="relative z-10 space-y-2 max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37]">
              CHI TIẾT DI SẢN & DANH LAM THẮNG CẢNH
            </div>
            <h2 className="text-4xl sm:text-6xl font-bold font-serif text-white tracking-tight leading-tight">
              {destination.name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-300 font-bold">
              <MapPin className="w-4 h-4 text-[#d4af37]" />
              <span>Tọa độ địa lý: {destination.coordinates[1]}°N, {destination.coordinates[0]}°E</span>
            </div>
          </div>
        </div>

        {/* Tabs Navigation Bar */}
        <div className={`flex items-center gap-3 border-b pb-4 text-xs font-bold uppercase tracking-[0.2em] ${
          isLight ? 'border-[#E5DEC9]' : 'border-amber-950/40'
        }`}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('activities');
            }}
            className={`px-5 py-2.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'activities'
                ? isLight ? 'bg-[#B8860B] text-white font-extrabold shadow-lg' : 'bg-[#d4af37] text-[#0C0805] font-extrabold shadow-lg'
                : isLight ? 'bg-[#F4F0E8] text-[#665E55] hover:text-[#B8860B] border border-[#D4C5A9]' : 'bg-[#14100c] text-slate-300 hover:text-[#d4af37] border border-amber-950/60'
            }`}
          >
            Hoạt Động & Chi Phí
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('overview');
            }}
            className={`px-5 py-2.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'overview'
                ? isLight ? 'bg-[#B8860B] text-white font-extrabold shadow-lg' : 'bg-[#d4af37] text-[#0C0805] font-extrabold shadow-lg'
                : isLight ? 'bg-[#F4F0E8] text-[#665E55] hover:text-[#B8860B] border border-[#D4C5A9]' : 'bg-[#14100c] text-slate-300 hover:text-[#d4af37] border border-amber-950/60'
            }`}
          >
            Đánh Giá & Phân Bổ
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('tips');
            }}
            className={`px-5 py-2.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'tips'
                ? isLight ? 'bg-[#B8860B] text-white font-extrabold shadow-lg' : 'bg-[#d4af37] text-[#0C0805] font-extrabold shadow-lg'
                : isLight ? 'bg-[#F4F0E8] text-[#665E55] hover:text-[#B8860B] border border-[#D4C5A9]' : 'bg-[#14100c] text-slate-300 hover:text-[#d4af37] border border-amber-950/60'
            }`}
          >
            Kinh Nghiệm Du Lịch
          </button>
        </div>

        {/* Tab Content Display with Stable Height */}
        <div className={`rounded-3xl p-6 sm:p-8 border shadow-xl flex flex-col justify-between min-h-[360px] ${
          isLight ? 'bg-white border-[#E5DEC9]' : 'bg-[#14100c] border-amber-950/60'
        }`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="space-y-6 flex-1"
            >
              {activeTab === 'activities' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-2xl font-bold font-serif flex items-center gap-2 ${
                      isLight ? 'text-[#231F1D]' : 'text-white'
                    }`}>
                      <Compass className={`w-5 h-5 ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`} />
                      Danh Sách Hoạt Động & Tour Gợi Ý
                    </h3>
                    <span className={`text-xs font-bold ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`}>
                      Ước tính: {(destination.satisfaction_scores.food * 400000).toLocaleString('vi-VN')} đ / ngày
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {destination.activities.map((act) => (
                      <div 
                        key={act.id} 
                        className={`p-4 rounded-2xl border transition-all duration-300 flex gap-4 items-center justify-between group shadow-md ${
                          isLight 
                            ? 'bg-[#FAF7F2] border-[#E5DEC9] hover:border-[#B8860B]' 
                            : 'bg-[#0C0805] border-amber-950/50 hover:border-[#d4af37]/60'
                        }`}
                      >
                        {/* Activity Thumbnail Image */}
                        <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 relative border ${
                          isLight ? 'bg-[#F4F0E8] border-[#D4C5A9]' : 'bg-[#14100c] border-amber-950/60'
                        }`}>
                          <SafeImage 
                            src={act.image || destination.hero_image} 
                            alt={act.name} 
                            fallbackTitle={act.name.slice(0, 10)}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                          />
                          <div className={`absolute top-1.5 right-1.5 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isLight ? 'bg-white/90 text-[#B8860B] border-[#D4C5A9]' : 'bg-[#0C0805]/85 text-amber-400 border-amber-950/60'
                          }`}>
                            ★ {act.score}
                          </div>
                        </div>

                        {/* Activity Text Info */}
                        <div className="flex-1 min-w-0 space-y-2 flex flex-col justify-between py-1">
                          <div>
                            <span className={`font-bold text-sm sm:text-base block line-clamp-2 transition-colors ${
                              isLight ? 'text-[#231F1D] group-hover:text-[#B8860B]' : 'text-white group-hover:text-[#d4af37]'
                            }`}>
                              {act.name}
                            </span>
                            <div className={`flex items-center gap-1.5 text-xs mt-1 ${
                              isLight ? 'text-[#665E55]' : 'text-slate-400'
                            }`}>
                              <Clock className={`w-3.5 h-3.5 ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`} />
                              <span>Thời gian ~ {act.duration_hrs} giờ</span>
                            </div>
                          </div>

                          <div className={`pt-2 border-t flex justify-between items-center text-xs ${
                            isLight ? 'border-[#E5DEC9]' : 'border-amber-950/40'
                          }`}>
                            <span className={`text-[11px] ${isLight ? 'text-[#8A8075]' : 'text-slate-400'}`}>Vé / Dịch vụ:</span>
                            <span className={`font-extrabold text-sm ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`}>
                              {act.cost === 0 ? 'Miễn Phí' : `${act.cost.toLocaleString('vi-VN')} đ`}
                            </span>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <h3 className={`text-2xl font-bold font-serif flex items-center gap-2 ${
                    isLight ? 'text-[#231F1D]' : 'text-white'
                  }`}>
                    <Bookmark className={`w-5 h-5 ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`} />
                    Chỉ Số Đóng Góp & Chất Lượng Dịch Vụ
                  </h3>

                  <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 rounded-2xl border text-center ${
                    isLight ? 'bg-[#FAF7F2] border-[#E5DEC9]' : 'bg-[#0C0805] border-amber-950/40'
                  }`}>
                    <div>
                      <span className={`text-[10px] block uppercase font-bold tracking-[0.2em] ${
                        isLight ? 'text-[#8A8075]' : 'text-slate-500'
                      }`}>Chất Lượng Lưu Trú</span>
                      <span className="text-2xl font-extrabold text-sky-500 mt-1 block">{destination.satisfaction_scores.stay} / 10</span>
                    </div>
                    <div>
                      <span className={`text-[10px] block uppercase font-bold tracking-[0.2em] ${
                        isLight ? 'text-[#8A8075]' : 'text-slate-500'
                      }`}>Ẩm Thực Vùng Miền</span>
                      <span className={`text-2xl font-extrabold mt-1 block ${
                        isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'
                      }`}>{destination.satisfaction_scores.food} / 10</span>
                    </div>
                    <div>
                      <span className={`text-[10px] block uppercase font-bold tracking-[0.2em] ${
                        isLight ? 'text-[#8A8075]' : 'text-slate-500'
                      }`}>Giao Thông Di Chuyển</span>
                      <span className="text-2xl font-extrabold text-purple-500 mt-1 block">{destination.satisfaction_scores.transport} / 10</span>
                    </div>
                    <div>
                      <span className={`text-[10px] block uppercase font-bold tracking-[0.2em] ${
                        isLight ? 'text-[#8A8075]' : 'text-slate-500'
                      }`}>Đa Dạng Trải Nghiệm</span>
                      <span className="text-2xl font-extrabold text-emerald-500 mt-1 block">{destination.satisfaction_scores.activities} / 10</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tips' && (
                <div className="space-y-4">
                  <h3 className={`text-2xl font-bold font-serif flex items-center gap-2 ${
                    isLight ? 'text-[#231F1D]' : 'text-white'
                  }`}>
                    <Compass className={`w-5 h-5 ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`} />
                    Cẩm Nang & Kinh Nghiệm Khám Phá
                  </h3>
                  <div className={`p-6 rounded-2xl border space-y-3 text-xs sm:text-sm leading-relaxed ${
                    isLight ? 'bg-[#FAF7F2] border-[#E5DEC9] text-[#231F1D]' : 'bg-[#0C0805] border-amber-950/40 text-slate-300'
                  }`}>
                    {(destination.travel_tips && destination.travel_tips.length > 0
                      ? destination.travel_tips
                      : [
                          { title: 'Thời điểm lý tưởng', content: 'Nên lên kế hoạch du lịch trước từ 2 - 3 tuần để đảm bảo vé tham quan và khách sạn có mức giá tốt nhất.' },
                          { title: 'Đặc sản nên thử', content: 'Thưởng thức các món ăn địa phương truyền thống tại các tuyến phố ẩm thực nổi tiếng.' },
                          { title: 'Tối ưu chi phí', content: 'Sử dụng bộ công cụ kéo trượt bên dưới để tính toán chính xác tổng chi phí cho số ngày bạn dự định đi.' }
                        ]
                    ).map((tip, idx) => (
                      <p key={idx}>
                        • <strong>{tip.title}:</strong> {tip.content}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* CTA Row */}
          <div className={`pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 ${
            isLight ? 'border-[#E5DEC9]' : 'border-amber-950/40'
          }`}>
            <div className={`text-xs ${isLight ? 'text-[#665E55]' : 'text-slate-400'}`}>
              Sẵn sàng trải nghiệm <strong className={isLight ? 'text-[#231F1D]' : 'text-white'}>{destination.name.split('-')[0].trim()}</strong>?
            </div>

            <button
              type="button"
              onClick={() => onSelectForPlanning(destination)}
              className={`px-8 py-3.5 rounded-full text-xs font-extrabold uppercase tracking-[0.2em] transition-all flex items-center gap-2 shadow-xl cursor-pointer hover:scale-105 ${
                isLight ? 'bg-[#B8860B] hover:bg-[#9E7B1A] text-white' : 'bg-[#d4af37] hover:bg-amber-400 text-[#0C0805]'
              }`}
            >
              <span>Tạo Lịch Trình Ngay</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FULL-WIDTH RECTANGULAR COLLAPSE BANNER */}
        <button
          onClick={onClose}
          className={`w-full py-4 rounded-none font-extrabold text-xs uppercase tracking-[0.2em] transition-all border flex items-center justify-center gap-2 cursor-pointer shadow-xl ${
            isLight 
              ? 'bg-[#F4F0E8] hover:bg-[#B8860B] text-[#4A4238] hover:text-white border-[#D4C5A9]' 
              : 'bg-[#14100c] hover:bg-[#d4af37] text-slate-300 hover:text-[#0C0805] border-amber-950/60 hover:border-[#d4af37]'
          }`}
        >
          <ChevronUp className="w-4 h-4" />
          <span>THU GỌN THÔNG TIN DANH THẮNG ✕</span>
        </button>

      </motion.section>
    </AnimatePresence>
  );
};
