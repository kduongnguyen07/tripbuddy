import React from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Destination } from '../../types';

interface PopularPlacesProps {
  destinations: Destination[];
  onSelectDestination: (dest: Destination) => void;
}

export const PopularPlacesSection: React.FC<PopularPlacesProps> = ({
  destinations,
  onSelectDestination
}) => {
  return (
    <section id="popular" className="pt-48 pb-24 px-8 max-w-7xl mx-auto space-y-12">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 font-serif tracking-tight">
            Popular Places
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-sans">
            The most beautiful places in Vietnam range from mountain resort towns and coastal villages to vibrant cities nested on rivers and bays.
          </p>
        </div>

        {/* Arrow Navigation */}
        <div className="flex items-center gap-3 shrink-0">
          <button className="w-11 h-11 rounded-full bg-slate-950 text-white flex items-center justify-center hover:bg-orange-500 transition-colors shadow-md">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button className="w-11 h-11 rounded-full bg-slate-950 text-white flex items-center justify-center hover:bg-orange-500 transition-colors shadow-md">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {destinations.slice(0, 4).map((dest, idx) => {
          const rating = ((dest.satisfaction_scores.stay + dest.satisfaction_scores.food + dest.satisfaction_scores.activities) / 3).toFixed(1);
          const estPrice = (dest.satisfaction_scores.food * 450000).toLocaleString('vi-VN');

          return (
            <motion.div
              key={dest.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-3xl p-4 shadow-card border border-slate-100 flex flex-col justify-between space-y-4 group hover:shadow-widget transition-all duration-300"
            >
              {/* Image Container with Top Rating Badge */}
              <div className="relative w-full h-52 rounded-2xl overflow-hidden">
                <img 
                  src={dest.hero_image} 
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Rating Badge (Top Right) */}
                <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-bold flex items-center gap-1 border border-white/20">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>{rating}</span>
                </div>
              </div>

              {/* Card Information */}
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-slate-900 font-serif group-hover:text-orange-500 transition-colors line-clamp-1">
                  {dest.name.split('-')[0].trim()}
                </h3>
                <p className="text-xs text-slate-400 font-sans line-clamp-1">
                  {dest.region} • {dest.activities[0]?.name || 'Điểm du lịch nổi tiếng'}
                </p>
              </div>

              {/* Price & Explore Button Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Chi phí trung bình</span>
                  <span className="font-extrabold text-slate-900 text-sm font-sans">{estPrice} đ</span>
                </div>

                <button
                  onClick={() => onSelectDestination(dest)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-orange-500/20 hover:scale-105 transition-all"
                >
                  Explore
                </button>
              </div>

            </motion.div>
          );
        })}
      </div>

      {/* Center "View All" Button */}
      <div className="text-center pt-4">
        <button 
          onClick={() => {
            const gallery = document.getElementById('guide');
            if (gallery) gallery.scrollIntoView({ behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-slate-300 text-slate-700 font-bold text-xs hover:border-orange-500 hover:text-orange-500 transition-colors"
        >
          <span>View All Places</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </section>
  );
};
