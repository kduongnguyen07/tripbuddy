import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { handleImageError, VIETNAM_LANDMARK_IMAGES } from '../../utils/imageUtils';

export const CulturalStatueSection: React.FC = () => {
  return (
    <section id="cultural" className="py-24 bg-white text-slate-900 relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column: Circular Arch Statue Feature with Curved SVG Text (Matching Screenshot) */}
        <div className="lg:col-span-6 relative flex items-center justify-center">
          
          {/* Curved Text SVG Container */}
          <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
            
            {/* SVG Circular Curved Text */}
            <svg viewBox="0 0 300 300" className="absolute inset-0 w-full h-full animate-spin-slow pointer-events-none">
              <path id="circlePath" d="M 150, 150 m -120, 0 a 120,120 0 1,1 240,0 a 120,120 0 1,1 -240,0" fill="none" />
              <text className="text-[10px] font-bold uppercase tracking-widest fill-amber-600 font-sans">
                <textPath href="#circlePath" startOffset="0%">
                  • SACRED LANDSCAPES • CULTURAL HERITAGE OF VIETNAM • WORLD WONDERS •
                </textPath>
              </text>
            </svg>

            {/* Circular Arch Masked Image */}
            <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full overflow-hidden border-4 border-amber-400/40 shadow-2xl relative group">
              <img 
                src={VIETNAM_LANDMARK_IMAGES.statue_arch} 
                alt="Vietnam Cultural Statue"
                onError={(e) => handleImageError(e, "Di Sản Văn Hóa Việt Nam")}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
            </div>

          </div>

        </div>

        {/* Right Column: Narrative Content & Stats Grid */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="lg:col-span-6 space-y-8"
        >
          <div className="space-y-4">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest font-sans">
              Discover Sacred Traditions
            </span>

            <h2 className="text-4xl sm:text-5xl font-black font-serif text-slate-900 tracking-tight leading-tight">
              Preserving Vietnam’s <br />
              <span className="text-amber-600">Cultural & Spiritual Legacy</span>
            </h2>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-sans">
              From ancient temples nestled amidst limestone crags in Ninh Binh to the dragon pagodas of Hue and Hanoi, Vietnam holds one of Asia’s richest heritage tapestries. Our PuLP budget engine ensures every journey honors local culture while maximizing your satisfaction.
            </p>
          </div>

          {/* Stats Grid matching Reference Screenshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-slate-200">
            <div>
              <div className="text-2xl sm:text-3xl font-black font-serif text-slate-900">3,500+</div>
              <div className="text-[11px] text-slate-500 font-sans mt-1">Heritage Sites</div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-black font-serif text-amber-600">98%</div>
              <div className="text-[11px] text-slate-500 font-sans mt-1">Satisfaction</div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-black font-serif text-slate-900">100+</div>
              <div className="text-[11px] text-slate-500 font-sans mt-1">Ancient Temples</div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-black font-serif text-slate-900">77</div>
              <div className="text-[11px] text-slate-500 font-sans mt-1">Festivals</div>
            </div>
          </div>

          <div className="pt-2">
            <button 
              onClick={() => {
                const masonry = document.getElementById('masonry');
                if (masonry) masonry.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-slate-900 text-slate-900 font-bold text-xs hover:bg-slate-900 hover:text-white transition-colors"
            >
              <span>Explore Cultural Places</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </motion.div>

      </div>

    </section>
  );
};
