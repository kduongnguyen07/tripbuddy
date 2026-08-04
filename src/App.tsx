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

  // Navigation State ('home' vs 'result') with localStorage persistence for F5 reload
  const [activePlan, setActivePlan] = useState<MaterializedPlan | null>(() => {
    try {
      const saved = localStorage.getItem('tripbuddy_active_plan');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentRoute, setCurrentRoute] = useState<'home' | 'result'>(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path.includes('/result') || hash === '#result') {
      const saved = localStorage.getItem('tripbuddy_active_plan');
      return saved ? 'result' : 'home';
    }
    return 'home';
  });

  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(destinations[0] || null);
  const [detailDestination, setDetailDestination] = useState<Destination | null>(null);
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  // Auto-refresh main page state when the dataset or destinations change
  const [, setRefreshTick] = useState<number>(0);
  useEffect(() => {
    const handleRefresh = () => {
      setRefreshTick((t) => t + 1);
    };
    window.addEventListener('tripbuddy_dataset_updated', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    return () => {
      window.removeEventListener('tripbuddy_dataset_updated', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, []);

  useEffect(() => {
    if (destinations.length > 0) {
      if (!selectedDestination || !destinations.some((d) => d.id === selectedDestination.id)) {
        setSelectedDestination(destinations[0]);
      }
      if (detailDestination && !destinations.some((d) => d.id === detailDestination.id)) {
        setDetailDestination(null);
      }
    } else {
      setSelectedDestination(null);
      setDetailDestination(null);
    }
  }, [destinations]);

  // Sync route with URL bar & popstate listener
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (path.includes('/result') || hash === '#result') {
        let planObj = activePlan;
        if (!planObj) {
          try {
            const saved = localStorage.getItem('tripbuddy_active_plan');
            if (saved) {
              planObj = JSON.parse(saved);
              setActivePlan(planObj);
            }
          } catch (e) {
            console.error('Failed to parse saved plan on F5:', e);
          }
        }

        if (planObj) {
          setCurrentRoute('result');
        } else {
          // Graceful fallback to homepage if no plan data exists
          setCurrentRoute('home');
          window.history.replaceState({}, '', '/');
        }
      } else if (path.includes('/muriel') || hash === '#muriel') {
        setIsLoginOpen(true);
      } else {
        setCurrentRoute('home');
      }
    };

    checkRoute();
    window.addEventListener('popstate', checkRoute);

    return () => {
      window.removeEventListener('popstate', checkRoute);
    };
  }, [activePlan]);

  const handlePlanGenerated = (plan: MaterializedPlan) => {
    try {
      localStorage.setItem('tripbuddy_active_plan', JSON.stringify(plan));
    } catch (e) {
      console.warn('Failed to store active plan in localStorage:', e);
    }
    setActivePlan(plan);
    setCurrentRoute('result');
    window.history.pushState({}, '', '/result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    try {
      localStorage.removeItem('tripbuddy_active_plan');
    } catch (e) {
      console.warn('Failed to clear active plan from localStorage:', e);
    }
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

      <AdminLoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={() => {
          setIsLoginOpen(false);
          setIsAdminOpen(true);
        }}
      />

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
                    TRIPBUDDY VIETNAM
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
              <span>© 2026 TripBuddy Vietnam. All rights reserved.</span>
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

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App ErrorBoundary caught an exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0C0805] text-white flex flex-col items-center justify-center p-6 text-center font-sans space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl">
            ⚠️
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-2xl font-extrabold text-white">Đã Xảy Ra Lỗi Hiển Thị Giao Diện</h2>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || 'Không thể nạp thành phần React.'}
            </p>
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/';
            }}
            className="px-6 py-3 rounded-full bg-[#d4af37] text-black font-extrabold text-xs uppercase tracking-wider hover:bg-amber-400 transition-colors shadow-lg cursor-pointer"
          >
            Tải Lại Trang Chủ →
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <DataProvider>
        <MainContent />
      </DataProvider>
    </ErrorBoundary>
  );
}
