import React from 'react';
import { motion } from 'framer-motion';
import { Flame, ArrowRight } from 'lucide-react';

import { handleImageError, VIETNAM_LANDMARK_IMAGES } from '../../utils/imageUtils';

export const MysticFestivalNightSection: React.FC = () => {
  return (
    <section className="py-24 bg-slate-950 text-white relative overflow-hidden">
      
      {/* Background Image with Dark Vignette */}
      <div className="absolute inset-0 z-0">
        <img 
          src={VIETNAM_LANDMARK_IMAGES.festival_night} 
          alt="Vietnam Festival Night"
          onError={(e) => handleImageError(e, "Lễ Hội Đêm Việt Nam")}
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Content Box matching Screenshot Section 4 */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="lg:col-span-6 space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold font-sans">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Night Festivals & Sacred Rituals</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black font-serif text-white tracking-tight leading-tight">
            Immerse in Vietnam’s <br />
            <span className="text-gradient-gold">Mystic Night Celebrations</span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base font-sans leading-relaxed">
            Experience the mesmerizing lantern lights of Hoi An, mountain campfire gatherings in Sa Pa, and traditional water puppetry under torchlights. Every journey planned with TripBudget AI balances night cultural tours with daytime adventures.
          </p>

          <div className="pt-2">
            <button 
              onClick={() => {
                const canvas = document.getElementById('canvas');
                if (canvas) canvas.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-8 py-3.5 rounded-full shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2"
            >
              <span>Plan Night Experience</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

      </div>

    </section>
  );
};
