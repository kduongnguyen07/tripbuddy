import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';


import { handleImageError, VIETNAM_LANDMARK_IMAGES } from '../../utils/imageUtils';

interface HeroPagodaSectionProps {
  onStartOptimize: () => void;
}

export const HeroPagodaSection: React.FC<HeroPagodaSectionProps> = ({ onStartOptimize }) => {
  return (
    <section id="hero" className="relative min-h-screen flex flex-col justify-between pt-36 pb-20 bg-slate-950 text-white overflow-hidden">
      
      {/* Background Pagoda Image with Golden Sunburst Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={VIETNAM_LANDMARK_IMAGES.hero_pagoda} 
          alt="Vietnam Sacred Pagoda"
          onError={(e) => handleImageError(e, "Hà Nội - Chùa Trấn Quốc")}
          className="w-full h-full object-cover object-top scale-105"
        />
        {/* Misty Cloud Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-950" />
      </div>

      {/* Hero Central Content Container matching New Screenshot */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 w-full pt-16 space-y-6 text-left">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-4 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>A Sacred Journey into Vietnam's World Wonders</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold font-serif tracking-tight text-white leading-tight">
            Sacred Heritage & <br />
            <span className="text-gradient-gold">World Wonders</span>
          </h1>

          <p className="text-slate-200 text-sm sm:text-base leading-relaxed font-sans max-w-lg">
            Journey through thousand-year-old pagodas, misty mountain peaks, and limestone waters. Our PuLP linear optimization algorithm builds your dream itinerary according to your exact budget constraints.
          </p>

          <div className="pt-4 flex items-center gap-4">
            <button
              onClick={onStartOptimize}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs px-8 py-4 rounded-full shadow-xl shadow-amber-500/25 hover:scale-105 transition-all flex items-center gap-3"
            >
              <span>Explore Places</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

      </div>

      {/* Cloud Bottom Mist Transition Effect (Matching bottom of hero in screenshot) */}
      <div className="relative z-10 w-full h-24 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />

    </section>
  );
};
