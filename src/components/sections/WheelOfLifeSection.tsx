import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Compass } from 'lucide-react';
import { SafeImage } from '../common/SafeImage';
import { useData } from '../../context/DataContext';

export const WheelOfLifeSection: React.FC = () => {
  const { slides, theme } = useData();
  const isLight = theme === 'light';

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);

  React.useEffect(() => {
    if (currentIndex >= slides.length && slides.length > 0) {
      setCurrentIndex(slides.length - 1);
    }
  }, [slides.length, currentIndex]);

  const currentSlide = slides[currentIndex] || slides[0] || {
    id: 'default',
    category: 'TRẢI NGHIỆM',
    title: 'Khám Phá Việt Nam',
    titleHighlight: 'Di Sản',
    description: 'Chưa có slide trải nghiệm...',
    image: '',
    imageCaptionTitle: '',
    imageCaptionSub: '',
    features: []
  };

  const handleNext = () => {
    if (slides.length === 0) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    if (slides.length === 0) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Compass Roulette Angle calculation (90deg per slide)
  const compassAngle = currentIndex * 90;

  return (
    <motion.section 
      id="wheel"
      initial={{ opacity: 0, y: 80, scale: 0.92 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: false, amount: 0.05 }}
      className={`py-24 relative overflow-hidden border-t font-sans transition-colors duration-500 ${
        isLight ? 'bg-[#FAF7F2] text-[#231F1D] border-[#E5DEC9]' : 'bg-[#0C0805] text-white border-amber-950/40'
      }`}
    >
      {/* Ambient Center Radial Glow */}
      <div className={`absolute inset-0 pointer-events-none ${
        isLight
          ? 'bg-[radial-gradient(circle_at_center,_rgba(184,134,11,0.06)_0%,_transparent_70%)]'
          : 'bg-[radial-gradient(circle_at_center,_rgba(212,175,55,0.09)_0%,_transparent_70%)]'
      }`} />
      
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-96 h-1 bg-gradient-to-r from-transparent ${
        isLight ? 'via-[#B8860B]/30' : 'via-[#d4af37]/40'
      } to-transparent`} />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-10 relative z-10">
        
        {/* Header Indicator Bar */}
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-6 border-b pb-6 max-w-5xl mx-auto ${
          isLight ? 'border-[#E5DEC9]' : 'border-amber-950/40'
        }`}>
          
          <div className="flex items-center gap-3">
            {/* Spinning Compass Dial Icon */}
            <motion.div 
              animate={{ rotate: compassAngle }}
              transition={{ type: 'spring', stiffness: 80, damping: 16 }}
              className={`w-9 h-9 rounded-full flex items-center justify-center border shadow-md ${
                isLight 
                  ? 'bg-[#B8860B]/15 border-[#B8860B]/50 text-[#B8860B]' 
                  : 'bg-[#d4af37]/15 border-[#d4af37]/50 text-[#d4af37]'
              }`}
            >
              <Compass className="w-5 h-5" />
            </motion.div>
            <div>
              <span className={`text-xs font-bold uppercase tracking-[0.25em] font-sans block ${
                isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'
              }`}>
                VÒNG XOAY TRẢI NGHIỆM
              </span>
              <span className={`text-[10px] font-sans ${isLight ? 'text-[#665E55]' : 'text-slate-400'}`}>
                Xoay compa khám phá di sản
              </span>
            </div>
          </div>

          {/* Interactive Roulette Notch Buttons */}
          <div className={`flex items-center gap-2 sm:gap-3 p-1.5 rounded-full border shadow-xl ${
            isLight ? 'bg-[#F4F0E8] border-[#D4C5A9]' : 'bg-[#14100c] border-amber-950/60'
          }`}>
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  setDirection(idx > currentIndex ? 1 : -1);
                  setCurrentIndex(idx);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-sans transition-all duration-500 cursor-pointer flex items-center gap-1.5 ${
                  idx === currentIndex
                    ? isLight
                      ? 'bg-[#B8860B] text-white shadow-md scale-105 font-extrabold'
                      : 'bg-[#d4af37] text-[#0C0805] shadow-[0_0_20px_rgba(212,175,55,0.5)] scale-105 font-extrabold'
                    : isLight
                      ? 'text-[#665E55] hover:text-[#231F1D] hover:bg-white'
                      : 'text-slate-400 hover:text-white hover:bg-amber-950/30'
                }`}
              >
                <span>0{idx + 1}</span>
                {idx === currentIndex && (
                  <motion.span 
                    layoutId="activeTabBadge"
                    className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                      isLight ? 'bg-white text-[#B8860B]' : 'bg-[#0C0805] text-[#d4af37]'
                    }`}
                  >
                    ROULETTE
                  </motion.span>
                )}
              </button>
            ))}
          </div>

        </div>

        {/* Outer Layout Row with Roulette Action Buttons */}
        <div className="flex items-center justify-between gap-4 sm:gap-6">
          
          {/* FAR LEFT ARROW BUTTON */}
          <button
            onClick={handlePrev}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-95 z-20 font-sans group ${
              isLight
                ? 'bg-white border-[#D4C5A9] text-[#231F1D] hover:bg-[#B8860B] hover:text-white hover:border-[#B8860B] shadow-md'
                : 'bg-[#14100c] border-[#d4af37]/40 hover:border-[#d4af37] text-white hover:bg-[#d4af37] hover:text-[#0C0805] shadow-xl'
            }`}
            title="Xoay sang trái"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-rotate-45 transition-transform" />
          </button>

          {/* Center Carousel Container */}
          <div className="flex-1 max-w-5xl mx-auto overflow-hidden py-4">
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={currentSlide.id}
                initial={{ 
                  opacity: 0, 
                  rotateY: direction * 35, 
                  x: direction * 40,
                  scale: 0.9,
                  filter: 'blur(6px)'
                }}
                animate={{ 
                  opacity: 1, 
                  rotateY: 0, 
                  x: 0,
                  scale: 1,
                  filter: 'blur(0px)'
                }}
                exit={{ 
                  opacity: 0, 
                  rotateY: -direction * 35, 
                  x: -direction * 40,
                  scale: 0.9,
                  filter: 'blur(6px)'
                }}
                transition={{ 
                  duration: 0.5, 
                  ease: [0.16, 1, 0.3, 1] 
                }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center [perspective:1000px]"
              >
                
                {/* Left Column: 3D Rotating Wheel Card */}
                <div className="lg:col-span-5 flex justify-center">
                  <motion.div 
                    initial={{ rotateY: direction * 25 }}
                    animate={{ rotateY: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className={`relative w-full max-w-sm h-96 sm:h-[430px] rounded-3xl overflow-hidden border-2 shadow-2xl group ${
                      isLight ? 'border-[#B8860B]/50 bg-slate-900' : 'border-[#d4af37]/60 bg-[#14100c]'
                    }`}
                  >
                    <SafeImage 
                      src={currentSlide.image} 
                      alt={currentSlide.title}
                      fallbackTitle={currentSlide.imageCaptionTitle}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
                    />
                    
                    {/* Dark Vignette Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0C0805] via-[#0C0805]/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none" />
                    
                    {/* Top Tag Pill */}
                    <div className="absolute top-4 left-4 bg-[#0C0805]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#d4af37] border border-[#d4af37]/50 shadow-xl flex items-center gap-1.5 font-sans">
                      <Compass className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>{currentSlide.imageCaptionSub}</span>
                    </div>

                    {/* Caption Box: Appears smoothly on Hover */}
                    <div className="absolute bottom-6 left-6 right-6 text-center space-y-1.5 bg-[#0C0805]/90 backdrop-blur-xl p-4 rounded-2xl border border-[#d4af37]/50 shadow-2xl opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 pointer-events-none">
                      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#d4af37] font-sans block">
                        {currentSlide.imageCaptionSub}
                      </span>
                      <h3 className="text-xl font-bold font-serif text-white truncate">
                        {currentSlide.imageCaptionTitle}
                      </h3>
                    </div>
                  </motion.div>
                </div>

                {/* Right Column: Narrative Content */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Category Pill */}
                  <div className={`inline-block px-3.5 py-1 rounded-full text-xs font-bold tracking-[0.2em] uppercase border font-sans ${
                    isLight 
                      ? 'bg-[#B8860B]/15 border-[#B8860B]/40 text-[#B8860B]' 
                      : 'bg-[#d4af37]/15 border-[#d4af37]/40 text-[#d4af37]'
                  }`}>
                    {currentSlide.category}
                  </div>

                  {/* Primary Headline */}
                  <h2 className={`text-4xl sm:text-6xl font-bold font-serif tracking-tight leading-[1.12] ${
                    isLight ? 'text-[#231F1D]' : 'text-white'
                  }`}>
                    {currentSlide.title} <br />
                    <span className={`font-serif italic font-normal ${isLight ? 'text-[#665E55]' : 'text-slate-300'}`}>với</span>{' '}
                    <span className={isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}>{currentSlide.titleHighlight}</span>
                  </h2>

                  {/* Description */}
                  <p className={`text-sm sm:text-base leading-relaxed font-sans font-normal ${
                    isLight ? 'text-[#4A4238]' : 'text-slate-300'
                  }`}>
                    {currentSlide.description}
                  </p>

                  {/* Feature Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-sans text-xs">
                    {currentSlide.features.map((feat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.8, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ 
                          duration: 0.4, 
                          delay: i * 0.04, 
                          ease: [0.16, 1, 0.3, 1] 
                        }}
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all shadow-sm group/feat ${
                          isLight 
                            ? 'bg-white border-[#E5DEC9] hover:border-[#B8860B] text-[#231F1D]' 
                            : 'bg-[#14100c]/90 border-amber-950/60 hover:border-[#d4af37]/60 text-slate-200'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isLight 
                            ? 'bg-[#B8860B]/15 text-[#B8860B] group-hover/feat:bg-[#B8860B] group-hover/feat:text-white' 
                            : 'bg-[#d4af37]/20 text-[#d4af37] group-hover/feat:bg-[#d4af37] group-hover/feat:text-[#0C0805]'
                        }`}>
                          <Compass className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate font-medium">{feat}</span>
                      </motion.div>
                    ))}
                  </div>

                </div>

              </motion.div>
            </AnimatePresence>
          </div>

          {/* FAR RIGHT ARROW BUTTON */}
          <button
            onClick={handleNext}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-95 z-20 font-sans group ${
              isLight
                ? 'bg-white border-[#D4C5A9] text-[#231F1D] hover:bg-[#B8860B] hover:text-white hover:border-[#B8860B] shadow-md'
                : 'bg-[#14100c] border-[#d4af37]/40 hover:border-[#d4af37] text-white hover:bg-[#d4af37] hover:text-[#0C0805] shadow-xl'
            }`}
            title="Xoay sang phải"
          >
            <ChevronRight className="w-6 h-6 group-hover:rotate-45 transition-transform" />
          </button>

        </div>

      </div>

    </motion.section>
  );
};
