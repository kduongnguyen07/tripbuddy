import React, { useState, useEffect } from 'react';
import {
  Navbar,
  HeroSection,
  BoutiqueJourneysSection,
  DestinationDetailSection,
  WheelOfLifeSection,
  ItineraryCanvas,
  PlanResultPage,
  AdminLoginModal,
  AdminDashboardModal,
} from './components';
import { DataProvider, useData } from './context/DataContext';
import { Destination, MaterializedPlan } from './types';
import { Compass, Heart } from 'lucide-react';

function MainContent() {
  const { destinations, theme } = useData();
  const isLight = theme === 'light';

  // Navigation & Routing State ('home' vs 'result')
  const [currentRoute, setCurrentRoute] = useState<'home' | 'result'>('home');
  const [activePlan, setActivePlan] = useState<MaterializedPlan | null>(null);

  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(destinations[0] || null);
  const [detailDestination, setDetailDestination] = useState<Destination | null>(null);
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  // Sync route with URL bar & popstate listener
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (path.includes('/result') || hash === '#result') {
        if (activePlan) {
          setCurrentRoute('result');
        } else {
          setCurrentRoute('home');
        }
      } else if (path.includes('/muriel') || hash === '#muriel') {
        setIsLoginOpen(true);
      } else {
        setCurrentRoute('home');
      }
    };

    checkRoute();
    window.addEventListener('popstate', checkRoute);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'M' || e.key === 'm' || e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsLoginOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePlan]);

  const handlePlanGenerated = (plan: MaterializedPlan) => {
    setActivePlan(plan);
    setCurrentRoute('result');
    window.history.pushState({}, '', '/result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setCurrentRoute('home');
    setActivePlan(null);
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectDestination = (dest: Destination) => {
    setSelectedDestination(dest);
    if (currentRoute === 'result') {
      setCurrentRoute('home');
      window.history.pushState({}, '', '/');
    }
    const canvasElement = document.getElementById('canvas');
    if (canvasElement) {
      canvasElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLearnMore = (dest: Destination) => {
    setDetailDestination(dest);
    setTimeout(() => {
      const detailElement = document.getElementById('destination-detail');
      if (detailElement) {
        detailElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleCloseDetail = () => {
    setDetailDestination(null);
    const journeysElement = document.getElementById('journeys');
    if (journeysElement) {
      journeysElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavigate = (sectionId: string) => {
    if (currentRoute === 'result') {
      setCurrentRoute('home');
      window.history.pushState({}, '', '/');
    }
    setActiveSection(sectionId);
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-500 selection:bg-[#d4af37] selection:text-[#0C0805] ${
        isLight ? 'bg-[#FAF7F2] text-[#231F1D]' : 'bg-[#0C0805] text-white'
      }`}
    >
      {/* 1. Header Navbar (Rendered ONLY on Homepage) */}
      {currentRoute !== 'result' && (
        <Navbar onNavigate={handleNavigate} activeSection={activeSection} />
      )}

      <main className="flex-1 flex flex-col">
        {currentRoute === 'result' && activePlan ? (
          /* DEDICATED FULL-SCREEN EDGE-TO-EDGE /result PAGE WORKSPACE */
          <PlanResultPage
            plan={activePlan}
            onPlanUpdated={(updated) => setActivePlan(updated)}
            onBackToHome={handleBackToHome}
            allDestinations={destinations}
            onSelectDestination={handleSelectDestination}
          />
        ) : (
          /* HOMEPAGE VIEW (/) */
          <>
            {/* 2. Hero Section */}
            <HeroSection onStartOptimize={() => handleNavigate('journeys')} />

            {/* 3. Destinations Collection Grid */}
            <BoutiqueJourneysSection
              destinations={destinations}
              onSelectDestination={handleSelectDestination}
              onLearnMore={handleLearnMore}
            />

            {/* 4. Dedicated Destination Detail Section */}
            <DestinationDetailSection
              destination={detailDestination}
              onSelectForPlanning={handleSelectDestination}
              onClose={handleCloseDetail}
            />

            {/* 5. Heritage & Cultural Experiences Interactive Slider */}
            <WheelOfLifeSection />

            {/* 6. Interactive Itinerary & Form Canvas */}
            <ItineraryCanvas
              selectedDestination={selectedDestination || destinations[0]}
              allDestinations={destinations}
              onSelectDestination={handleSelectDestination}
              onPlanGenerated={handlePlanGenerated}
            />
          </>
        )}
      </main>

      {/* Admin Passcode Login Modal */}
      <AdminLoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={() => {
          setIsLoginOpen(false);
          setIsAdminOpen(true);
        }}
      />

      {/* Master Admin CMS Dashboard Modal */}
      <AdminDashboardModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />

      {/* Footer (Rendered ONLY on Homepage) */}
      {currentRoute !== 'result' && (
        <footer
          className={`py-12 px-8 text-xs font-sans border-t transition-colors duration-500 ${
            isLight
              ? 'bg-[#F4F0E8] text-[#4A4238] border-[#E5DEC9]'
              : 'bg-[#060403] text-white border-amber-950/40'
          }`}
        >
          <div className="max-w-7xl mx-auto space-y-8">
            <div
              className={`flex flex-col md:flex-row items-center justify-between gap-6 border-b pb-6 ${
                isLight ? 'border-[#E5DEC9]' : 'border-amber-950/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md ${
                    isLight ? 'bg-[#B8860B] text-white' : 'bg-[#d4af37] text-[#0C0805]'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <div
                    className={`font-extrabold text-sm font-sans tracking-widest uppercase ${
                      isLight ? 'text-[#231F1D]' : 'text-white'
                    }`}
                  >
                    TRIPBUDGET VIETNAM
                  </div>
                  <p
                    className={`text-[11px] ${
                      isLight ? 'text-[#665E55]' : 'text-slate-400'
                    }`}
                  >
                    Website Lập Kế Hoạch & Dự Toán Chi Phí Du Lịch Việt Nam
                  </p>
                </div>
              </div>

              <div
                className={`text-[11px] ${
                  isLight ? 'text-[#665E55]' : 'text-slate-400'
                }`}
              >
                Khám Phá Di Sản Thiên Nhiên & Văn Hóa Việt Nam
              </div>
            </div>

            <div
              className={`flex flex-col md:flex-row justify-between items-center text-[11px] gap-4 ${
                isLight ? 'text-[#8A8075]' : 'text-slate-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <span>© 2026 TripBudget Vietnam. All rights reserved.</span>
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="ml-3 text-[#d4af37] hover:underline font-extrabold cursor-pointer"
                  title="Mở Trang Quản Trị Admin System"
                >
                  ⚙️ Quản Trị Hệ Thống (Admin Portal)
                </button>
              </div>
              <div className="flex items-center gap-1">
                <span>Bản quyền nội dung thuộc về</span>
                <Heart className="w-3.5 h-3.5 fill-[#d4af37] text-[#d4af37]" />
                <span>Du Lịch Việt Nam</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export function App() {
  return (
    <DataProvider>
      <MainContent />
    </DataProvider>
  );
}
