import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Sparkles, Award } from 'lucide-react';

export const UniqueExperiencesSection: React.FC = () => {
  return (
    <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
      
      {/* Vertical Watermarked Text on Right Edge matching Reference Screenshot */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-800 font-serif font-black text-8xl tracking-widest pointer-events-none opacity-40 select-none writing-vertical">
        VIETNAM
      </div>

      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Text Column */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="lg:col-span-7 space-y-8"
        >
          <div className="space-y-4">
            <span className="text-sm font-medium text-orange-400 uppercase tracking-widest">About TripBuddy</span>
            
            <h2 className="text-4xl sm:text-6xl font-black font-serif tracking-tight leading-tight">
              We are collectors of <br />
              <span className="text-orange-500">Unique Experiences</span>
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl font-sans">
              Committed to bringing you authentic Vietnam experiences with highest precision. Our PuLP linear optimization engine ensures every dollar spent delivers maximum joy across food, stay, and culture.
            </p>
          </div>

          {/* Stats Counters Grid matching Screenshot */}
          <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-800">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-serif">30+</div>
              <div className="text-xs text-slate-400 font-sans mt-1">Destinations</div>
            </div>

            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-orange-500 font-serif">15+</div>
              <div className="text-xs text-slate-400 font-sans mt-1">Years Experience</div>
            </div>

            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-serif">100%</div>
              <div className="text-xs text-slate-400 font-sans mt-1">PuLP Precision</div>
            </div>
          </div>

        </motion.div>

        {/* Right Circular Visual Badge Graphic matching Reference Screenshot */}
        <div className="lg:col-span-5 relative flex justify-center items-center">
          <div className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80" 
              alt="Vietnam Scenery" 
              className="w-full h-full object-cover"
            />
            
            {/* Vietnam Flag Badge in Center */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/60 via-transparent to-transparent flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-red-600 border-2 border-yellow-400 flex items-center justify-center shadow-xl text-yellow-400 font-black text-2xl">
                ★
              </div>
            </div>
          </div>

          {/* Floating Circular Orange Badge matching Screenshot (Unmatched Lands) */}
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-2 right-4 w-28 h-28 rounded-full bg-orange-500 text-white p-3 flex flex-col items-center justify-center text-center shadow-2xl border-2 border-white cursor-pointer hover:scale-110 transition-transform"
          >
            <Compass className="w-6 h-6 mb-1 animate-spin-slow" />
            <span className="text-[10px] font-bold uppercase tracking-tighter leading-none">Unmatched Lands</span>
          </motion.div>

        </div>

      </div>

    </section>
  );
};
