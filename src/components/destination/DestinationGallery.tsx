import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Star, Sparkles, ChevronRight, Award } from 'lucide-react';
import { Destination } from '../../types';

interface DestinationGalleryProps {
  destinations: Destination[];
  selectedDestinationId: string;
  onSelectDestination: (dest: Destination) => void;
}

export const DestinationGallery: React.FC<DestinationGalleryProps> = ({
  destinations,
  selectedDestinationId,
  onSelectDestination
}) => {
  return (
    <section id="gallery" className="py-24 bg-[#081C26] relative overflow-hidden border-y border-teal-900/30">
      
      {/* Background Decorative Graphic Overlays */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 relative z-10 space-y-12">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold">
            <Award className="w-3.5 h-3.5 text-teal-400" />
            <span>Bộ Sưu Tập Danh Lam Thắng Cảnh Việt Nam</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Điểm Đến <span className="text-gradient-teal">Nổi Bật</span>
          </h2>
          
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Chọn danh lam bạn muốn ghé thăm. Thuật toán PuLP sẽ tự động tối ưu hóa từng hạng mục vé tham quan, lưu trú và ẩm thực theo ngân sách của bạn.
          </p>
        </div>

        {/* Circular & Oval Image Mask Gallery Grid with Framer Motion */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {destinations.map((dest, index) => {
            const isSelected = dest.id === selectedDestinationId;
            const avgRating = ((dest.satisfaction_scores.stay + dest.satisfaction_scores.food + dest.satisfaction_scores.activities) / 3).toFixed(1);

            return (
              <motion.div
                key={dest.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => onSelectDestination(dest)}
                className={`relative rounded-3xl p-5 cursor-pointer transition-all duration-300 ${
                  isSelected 
                    ? 'bg-slate-900/90 border-2 border-teal-400 shadow-2xl shadow-teal-500/20 glow-teal' 
                    : 'glass-card hover:border-teal-500/40 hover:bg-slate-900/80'
                }`}
              >
                {/* Oval / Circular Mask Image Container */}
                <div className="relative w-full h-56 rounded-2xl overflow-hidden mb-5 group">
                  <img 
                    src={dest.hero_image} 
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 rounded-2xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                  {/* Region Badge */}
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-semibold text-teal-300 border border-teal-500/30">
                    {dest.region}
                  </div>

                  {/* Rating Tag */}
                  <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 text-[11px] font-bold text-amber-400 border border-amber-500/30">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{avgRating}</span>
                  </div>

                  {/* Selected Indicator Pill */}
                  {isSelected && (
                    <div className="absolute bottom-3 right-3 bg-teal-500 text-slate-950 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1 shadow-lg">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Đã Chọn</span>
                    </div>
                  )}
                </div>

                {/* Card Meta Content */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-lg text-white line-clamp-1 hover:text-teal-400 transition-colors">
                      {dest.name}
                    </h3>
                  </div>

                  {/* Sub-activities Preview */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span className="truncate">
                      {dest.activities[0]?.name || 'Địa danh du lịch nổi tiếng'}
                    </span>
                  </div>

                  {/* Pricing Tier Estimate */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Ước tính ngày:</span>
                    <span className="font-semibold text-emerald-400">
                      {(dest.satisfaction_scores.food * 40000).toLocaleString('vi-VN')} đ/ngày
                    </span>
                  </div>
                </div>

                {/* Hover CTA Indicator */}
                <div className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-teal-400 group-hover:translate-x-1 transition-transform">
                  <span>Tối Ưu Ngân Sách Điểm Này</span>
                  <ChevronRight className="w-4 h-4" />
                </div>

              </motion.div>
            );
          })}
        </div>

      </div>

    </section>
  );
};
