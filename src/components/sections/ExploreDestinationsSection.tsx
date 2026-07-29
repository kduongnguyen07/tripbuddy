import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

import { Destination } from '../../types';

interface ExploreDestinationsProps {
  destinations: Destination[];
  onSelectDestination: (dest: Destination) => void;
}

export const ExploreDestinationsSection: React.FC<ExploreDestinationsProps> = ({
  destinations,
  onSelectDestination
}) => {
  const featuredDest = destinations.find(d => d.id === 'ha-long') || destinations[0];
  const sideLeftDest = destinations.find(d => d.id === 'sapa') || destinations[1];
  const sideRightDest = destinations.find(d => d.id === 'hoi-an') || destinations[2];

  return (
    <section id="explore-dest" className="py-24 px-8 max-w-7xl mx-auto space-y-12">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h2 className="text-4xl sm:text-5xl font-black text-slate-900 font-serif tracking-tight">
          Explore Destinations
        </h2>
        <p className="text-slate-500 text-sm sm:text-base font-sans leading-relaxed">
          With its unique cuisine, rich culture, UNESCO world heritage sites, and tropical beaches, Vietnam offers adventure for everyone's taste.
        </p>
      </div>

      {/* Featured Horizontal Card with Slim Vertical Side Cards (Matching Screenshot Layout) */}
      <div className="relative flex items-center justify-center gap-6 overflow-hidden py-4">
        
        {/* Left Side Slim Card Preview */}
        <div className="hidden lg:block w-36 h-96 rounded-3xl overflow-hidden relative opacity-60 hover:opacity-100 transition-opacity cursor-pointer shadow-md shrink-0"
             onClick={() => onSelectDestination(sideLeftDest)}>
          <img src={sideLeftDest.hero_image} alt={sideLeftDest.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-slate-950/40" />
          <div className="absolute bottom-6 left-4 right-4 text-white font-serif font-bold text-sm truncate">
            {sideLeftDest.name.split('-')[0]}
          </div>
        </div>

        {/* Center Main Featured Card (Matching Screenshot) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="relative w-full max-w-3xl h-[420px] rounded-3xl overflow-hidden shadow-widget border border-slate-200 group shrink-0"
        >
          {/* Background Image */}
          <img 
            src={featuredDest.hero_image} 
            alt={featuredDest.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />

          {/* Gradient Mask */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

          {/* Special Offer Badge (Top Left) */}
          <div className="absolute top-6 left-6 bg-blue-600/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
            Special Offer
          </div>

          {/* Rating Badge (Top Right) */}
          <div className="absolute top-6 right-6 bg-slate-950/80 backdrop-blur-md text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 border border-white/20">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>4.9</span>
          </div>

          {/* Bottom Card Information matching Screenshot */}
          <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row md:items-end justify-between gap-6 text-white">
            <div className="space-y-2 max-w-md">
              <span className="text-xs font-medium uppercase tracking-widest text-slate-300">Vietnam</span>
              <h3 className="text-3xl sm:text-4xl font-extrabold font-serif">
                {featuredDest.name.split('-')[0].trim()}
              </h3>
              <p className="text-xs text-slate-300 line-clamp-2 font-sans">
                The emerald waters and thousands of towering limestone islands topped by rainforests make Ha Long Bay a world wonder.
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-300 block uppercase">Estimate / Day</span>
              <div className="text-2xl font-black text-white mb-3">4.500.000 đ</div>
              
              <button
                onClick={() => onSelectDestination(featuredDest)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-orange-500/30 hover:scale-105 transition-all"
              >
                Explore
              </button>
            </div>
          </div>

        </motion.div>

        {/* Right Side Slim Card Preview */}
        <div className="hidden lg:block w-36 h-96 rounded-3xl overflow-hidden relative opacity-60 hover:opacity-100 transition-opacity cursor-pointer shadow-md shrink-0"
             onClick={() => onSelectDestination(sideRightDest)}>
          <img src={sideRightDest.hero_image} alt={sideRightDest.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-slate-950/40" />
          <div className="absolute bottom-6 left-4 right-4 text-white font-serif font-bold text-sm truncate">
            {sideRightDest.name.split('-')[0]}
          </div>
        </div>

      </div>

      {/* Pagination dots matching reference */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
        <span className="w-8 h-2.5 rounded-full bg-orange-500" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
      </div>

    </section>
  );
};
