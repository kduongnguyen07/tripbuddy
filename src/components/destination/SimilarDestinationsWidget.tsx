import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MapPin, Tag, ArrowRight } from 'lucide-react';
import { Destination, SimilarDestinationResult } from '../../types';
import { getSimilarDestinationsApi } from '../../services/api';
import { useData } from '../../context/DataContext';

interface SimilarDestinationsWidgetProps {
  currentDestinationId: string;
  onSelectDestination: (dest: Destination) => void;
}

export const SimilarDestinationsWidget: React.FC<SimilarDestinationsWidgetProps> = ({
  currentDestinationId,
  onSelectDestination,
}) => {
  const { theme } = useData();
  const isLight = theme === 'light';

  const [similarList, setSimilarList] = useState<SimilarDestinationResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getSimilarDestinationsApi(currentDestinationId, 3)
      .then((data) => {
        if (isMounted) setSimilarList(data);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentDestinationId]);

  if (loading) {
    return (
      <div className="p-4 text-center text-xs text-slate-400 bg-[#0C0805] rounded-2xl border border-amber-950/40 font-sans">
        <div className="animate-spin w-5 h-5 border-2 border-[#d4af37] border-t-transparent rounded-full mx-auto mb-1.5" />
        Đang phân tích thẻ đặc trưng & tìm điểm đến tương tự...
      </div>
    );
  }

  if (similarList.length === 0) return null;

  return (
    <div
      className={`rounded-3xl p-6 border shadow-xl space-y-4 font-sans transition-colors duration-500 ${
        isLight
          ? 'bg-white border-[#E5DEC9] text-[#231F1D]'
          : 'bg-[#14100c] border-amber-950/60 text-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#d4af37]" />
          <h4 className="font-bold text-sm font-serif">
            Gợi Ý Điểm Đến Tương Tự:
          </h4>
        </div>
        <span className="text-[10px] text-[#d4af37] font-bold bg-[#d4af37]/15 px-2.5 py-0.5 rounded-full border border-[#d4af37]/30">
          Cùng phong cách
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {similarList.map((item) => (
          <motion.div
            key={item.destination.id}
            whileHover={{ y: -4 }}
            onClick={() => onSelectDestination(item.destination)}
            className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 group ${
              isLight
                ? 'bg-[#FAF7F2] hover:bg-[#F4F0E8] border-[#E5DEC9]'
                : 'bg-[#0C0805] hover:bg-[#1a140f] border-amber-950/40 hover:border-[#d4af37]/60'
            }`}
          >
            <div className="space-y-2">
              <div className="relative h-24 rounded-xl overflow-hidden">
                <img
                  src={item.destination.hero_image}
                  alt={item.destination.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div>
                <h5 className={`font-bold text-xs font-serif flex items-center gap-1 transition-colors ${
                  isLight
                    ? 'text-[#231F1D] group-hover:text-[#B8860B]'
                    : 'text-white group-hover:text-[#d4af37]'
                }`}>
                  <MapPin className={`w-3 h-3 ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`} />
                  {item.destination.name.split('-')[0].trim()}
                </h5>
                <span className={`text-[10px] block mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {item.destination.region}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 pt-1">
                {item.matching_tags.map((tag) => (
                  <span
                    key={tag}
                    className={`px-1.5 py-0.5 rounded-md text-[9px] flex items-center gap-0.5 border ${
                      isLight
                        ? 'bg-amber-100/70 text-amber-900 border-amber-300'
                        : 'bg-amber-950/40 text-[#d4af37] border-[#d4af37]/20'
                    }`}
                  >
                    <Tag className="w-2.5 h-2.5" /> #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className={`pt-2 border-t flex items-center justify-between text-[11px] font-bold ${
              isLight ? 'border-[#E5DEC9] text-[#B8860B]' : 'border-amber-950/30 text-[#d4af37]'
            }`}>
              <span>Khám phá lịch trình</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
