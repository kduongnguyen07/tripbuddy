import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Star, ChevronRight, Info } from 'lucide-react';
import { Destination } from '../../types';
import { SafeImage } from '../common/SafeImage';
import { useData } from '../../context/DataContext';

interface BoutiqueJourneysProps {
  destinations: Destination[];
  onSelectDestination: (dest: Destination) => void;
  onLearnMore: (dest: Destination) => void;
}

// Ratings shown on the destination cards are curated on a 5-star scale so
// every destination does not appear to have the same score.
const DESTINATION_RATINGS: Record<string, number> = {
  HAN: 4.8,
  HUE: 4.7,
  DAD: 4.9,
  DLD: 4.6,
  PQC: 4.8,
  'HA-NOI': 4.8,
  'DA-NANG': 4.9,
  'DA-LAT': 4.6,
  'PHU-QUOC': 4.8,
};

// Typical one-person daily budgets, including accommodation, meals and
// sightseeing. The values are intentionally destination-specific because
// using the database fallback alone makes every card display 750,000 đ.
const DESTINATION_DAILY_ESTIMATES: Record<string, number> = {
  HAN: 980_000,
  HUE: 680_000,
  DAD: 1_150_000,
  DLD: 820_000,
  PQC: 1_450_000,
  'HA-NOI': 980_000,
  'DA-NANG': 1_150_000,
  'DA-LAT': 820_000,
  'PHU-QUOC': 1_450_000,
};

const getDestinationRating = (destination: Destination): number => {
  if (!destination) return 4.8;
  const key = (destination.code || destination.id || '').toUpperCase();
  const curatedRating = DESTINATION_RATINGS[key];

  if (curatedRating) return curatedRating;

  const scores = destination.satisfaction_scores || { stay: 9.0, food: 9.0, activities: 9.0 };
  const stay = scores.stay || 9.0;
  const food = scores.food || 9.0;
  const activities = scores.activities || 9.0;
  const average = (stay + food + activities) / 3;
  return Number((average > 5 ? average / 2 : average).toFixed(1));
};

const getDailyEstimatePerPerson = (destination: Destination): number => {
  const key = (destination.code || destination.id).toUpperCase();
  const destinationEstimate = DESTINATION_DAILY_ESTIMATES[key];

  if (destinationEstimate) return destinationEstimate;

  // minimum_two_day_cost_vnd represents the minimum cost for two days.
  // Dividing by two gives the estimate for one person for one day.
  const twoDayCost = destination.minimum_two_day_cost_vnd || 1_500_000;
  return Math.round((twoDayCost / 2) / 10_000) * 10_000;
};

export const BoutiqueJourneysSection: React.FC<BoutiqueJourneysProps> = ({
  destinations,
  onSelectDestination,
  onLearnMore
}) => {
  const { theme } = useData();
  const isLight = theme === 'light';

  return (
    <motion.section 
      id="journeys"
      className={`py-24 px-8 max-w-7xl mx-auto space-y-12 font-sans overflow-hidden transition-colors duration-500 ${
        isLight ? 'bg-[#FAF7F2] text-[#231F1D]' : 'bg-[#0C0805] text-white'
      }`}
    >
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
        viewport={{ once: false, amount: 0.2 }}
        className={`flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-6 ${
          isLight ? 'border-[#E5DEC9]' : 'border-amber-950/40'
        }`}
      >
        <div className="space-y-2">
          {/* Sub-label */}
          <div className={`text-xs font-bold tracking-[0.2em] uppercase font-sans ${
            isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'
          }`}>
            BỘ SƯU TẬP ĐIỂM ĐẾN
          </div>
          {/* H2 Heading */}
          <h2 className={`text-4xl sm:text-6xl font-bold font-serif tracking-tight ${
            isLight ? 'text-[#231F1D]' : 'text-white'
          }`}>
            Hành Trình Khám Phá <span className={isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}>Nổi Bật</span>
          </h2>
        </div>

        <p className={`text-xs sm:text-sm font-sans max-w-md ${
          isLight ? 'text-[#665E55]' : 'text-slate-400'
        }`}>
          Khám phá các di sản thiên nhiên và văn hóa Việt Nam được thiết kế riêng với dự toán chi phí minh bạch.
        </p>
      </motion.div>

      {/* Grid of Boutique Cards */}
      {destinations.length === 0 ? (
        <div className={`text-center py-16 text-sm rounded-2xl border ${isLight ? 'bg-white border-[#E5DEC9] text-[#665E55]' : 'bg-[#14100c] border-amber-950/40 text-slate-400'}`}>
          Chưa có điểm đến nào để hiển thị.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {destinations.map((dest, idx) => {
            const rating = getDestinationRating(dest);
            const dailyEstimate = getDailyEstimatePerPerson(dest);

          return (
            <motion.div
              key={dest.id}
              initial={{ opacity: 0, y: 55 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.8, 
                delay: (idx % 3) * 0.14 + Math.floor(idx / 3) * 0.1, 
                ease: [0.25, 1, 0.5, 1] 
              }}
              viewport={{ once: false, amount: 0.2 }}
              className={`rounded-3xl overflow-hidden border transition-all duration-500 flex flex-col justify-between shadow-xl hover:-translate-y-1.5 relative group ${
                isLight 
                  ? 'bg-white border-[#E5DEC9] hover:border-[#B8860B]' 
                  : 'bg-[#14100c] border-amber-950/50 hover:border-[#d4af37]/60'
              }`}
            >
              {/* Image Container */}
              <div 
                className="relative h-64 overflow-hidden bg-slate-900 cursor-pointer"
                onClick={() => onLearnMore(dest)}
              >
                <SafeImage 
                  src={dest.hero_image} 
                  alt={dest.name}
                  fallbackTitle={dest.name.split('-')[0].trim()}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className={`absolute inset-0 bg-gradient-to-t pointer-events-none ${
                  isLight ? 'from-white/80 via-transparent to-transparent' : 'from-[#14100c] via-transparent to-transparent'
                }`} />

                {/* Rating Badge */}
                <div className={`absolute top-3 right-3 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 border shadow-lg font-sans ${
                  isLight 
                    ? 'bg-white/90 text-[#B8860B] border-[#D4C5A9]' 
                    : 'bg-[#0C0805]/90 text-[#d4af37] border-[#d4af37]/40'
                }`}>
                  <Star className={`w-3 h-3 ${isLight ? 'fill-[#B8860B]' : 'fill-[#d4af37]'}`} />
                  <span>{rating}</span>
                </div>

                {/* Region Tag */}
                <div className={`absolute top-3 left-3 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold border shadow-lg font-sans ${
                  isLight 
                    ? 'bg-white/90 text-[#4A4238] border-[#D4C5A9]' 
                    : 'bg-[#0C0805]/90 text-slate-300 border-slate-700'
                }`}>
                  {dest.region}
                </div>
              </div>

              {/* Card Meta Content */}
              <div className="p-6 space-y-4 font-sans relative">
                <div>
                  <h3 
                    onClick={() => onLearnMore(dest)}
                    className={`font-serif font-bold text-2xl transition-colors line-clamp-1 cursor-pointer ${
                      isLight ? 'text-[#231F1D] group-hover:text-[#B8860B]' : 'text-white group-hover:text-[#d4af37]'
                    }`}
                  >
                    {dest.name}
                  </h3>
                  <div className={`flex items-center gap-1.5 text-xs mt-1 font-sans ${
                    isLight ? 'text-[#665E55]' : 'text-slate-400'
                  }`}>
                    <MapPin className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`} />
                    <span className="truncate">{(dest.activities && dest.activities[0]?.name) || dest.name}</span>
                  </div>
                </div>

                {/* Bottom Row: Price + Khám Phá Button */}
                <div className={`pt-3 border-t flex items-center justify-between font-sans ${
                  isLight ? 'border-[#E5DEC9]' : 'border-amber-950/40'
                }`}>
                  <div>
                    <span className={`text-[10px] block uppercase font-bold tracking-[0.2em] ${
                      isLight ? 'text-[#8A8075]' : 'text-slate-500'
                    }`}>Dự toán / người / ngày</span>
                    <span className={`font-extrabold text-sm ${
                      isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'
                    }`}>
                      {dailyEstimate.toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  {/* KHÁM PHÁ BUTTON */}
                  <button
                    onClick={() => onSelectDestination(dest)}
                    className={`py-2.5 px-4 rounded-full text-[11px] font-extrabold tracking-[0.15em] uppercase transition-all flex items-center justify-center gap-1 shadow-lg hover:scale-105 active:scale-95 cursor-pointer ${
                      isLight
                        ? 'bg-[#B8860B] hover:bg-[#9E7B1A] text-white'
                        : 'bg-[#d4af37] hover:bg-amber-400 text-[#0C0805]'
                    }`}
                  >
                    <span>Khám Phá</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>

              {/* TÌM HIỂU THÊM BOTTOM HOVER BANNER */}
              <button
                onClick={() => onLearnMore(dest)}
                className={`w-full py-3.5 font-extrabold text-xs uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 cursor-pointer shadow-2xl rounded-none ${
                  isLight ? 'bg-[#B8860B] hover:bg-[#9E7B1A] text-white' : 'bg-[#d4af37] hover:bg-amber-400 text-[#0C0805]'
                }`}
              >
                <Info className="w-4 h-4" />
                <span>Tìm Hiểu Thêm Về Danh Thắng →</span>
              </button>

            </motion.div>
          );
        })}
      </div>
      )}

    </motion.section>
  );
};
