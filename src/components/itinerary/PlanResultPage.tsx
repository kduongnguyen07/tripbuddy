import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle,
  MapPin,
  Calendar,
  Wallet,
  Compass,
  GripVertical,
} from 'lucide-react';
import {
  MaterializedPlan,
  PlanSelection,
  PlanServiceItem,
  Destination,
} from '../../types';
import { BudgetDashboard } from './BudgetDashboard';
import { ItineraryTimeline } from './ItineraryTimeline';
import { SwapItemModal } from './SwapItemModal';
import { ActivityInspectionPanel } from './ActivityInspectionPanel';
import { InfographicExporter } from '../common/InfographicExporter';
import { SimilarDestinationsWidget } from '../destination/SimilarDestinationsWidget';
import { useData } from '../../context/DataContext';

interface PlanResultPageProps {
  plan: MaterializedPlan;
  onPlanUpdated: (updatedPlan: MaterializedPlan) => void;
  onBackToHome: () => void;
  allDestinations: Destination[];
  onSelectDestination: (dest: Destination) => void;
}

export const PlanResultPage: React.FC<PlanResultPageProps> = ({
  plan,
  onPlanUpdated,
  onBackToHome,
  allDestinations,
  onSelectDestination,
}) => {
  const { theme } = useData();
  const isLight = theme === 'light';

  // Get default first service from itinerary for initial inspection state
  const defaultFirstService =
    plan.daily_itinerary && plan.daily_itinerary.length > 0 && plan.daily_itinerary[0].events.length > 0
      ? plan.daily_itinerary[0].events[0]
      : null;

  const defaultFirstSelection: PlanSelection | null = defaultFirstService
    ? { service_id: defaultFirstService.id, day: 1, slot: defaultFirstService.slot || 'morning' }
    : null;

  // Active Inspected Activity State for Left Column Top Panel
  const [inspectedService, setInspectedService] = useState<PlanServiceItem | null>(defaultFirstService);
  const [inspectedSelection, setInspectedSelection] = useState<PlanSelection | null>(defaultFirstSelection);

  // Swap Item Modal State
  const [swapModalOpen, setSwapModalOpen] = useState<boolean>(false);
  const [targetSelection, setTargetSelection] = useState<PlanSelection | null>(null);
  const [targetService, setTargetService] = useState<PlanServiceItem | null>(null);

  // Resizable Splitter Panel State (left width in percentage, default 48%)
  const [leftWidth, setLeftWidth] = useState<number>(48);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newLeftWidth =
          ((mouseMoveEvent.clientX - containerRect.left) / containerRect.width) * 100;
        // Clamp width between 25% and 75%
        if (newLeftWidth >= 25 && newLeftWidth <= 75) {
          setLeftWidth(newLeftWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const handleOpenSwapModal = (target: PlanSelection, service: PlanServiceItem) => {
    if (!plan.plan_state) return;
    setTargetSelection(target);
    setTargetService(service);
    setSwapModalOpen(true);
  };

  const handleInspectService = (service: PlanServiceItem, target: PlanSelection) => {
    setInspectedService(service);
    setInspectedSelection(target);
  };

  const selectedDest =
    allDestinations.find((d) => d.id === plan.destination?.id) || allDestinations[0];

  return (
    <div
      className={`h-screen w-full flex flex-col font-sans transition-colors duration-500 overflow-hidden selection:bg-[#d4af37] selection:text-[#0C0805] ${
        isLight ? 'bg-[#FAF7F2] text-[#231F1D]' : 'bg-[#0C0805] text-white'
      }`}
      id="plan-result-page"
    >
      {/* MINIMAL TOP BAR HEADER */}
      <header
        className={`h-16 px-6 border-b flex items-center justify-between gap-4 shrink-0 transition-colors duration-500 ${
          isLight
            ? 'bg-white border-[#E5DEC9] text-[#231F1D]'
            : 'bg-[#14100c] border-amber-950/60 text-white'
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Back to Home Button */}
          <button
            onClick={onBackToHome}
            className={`px-4 py-2 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-md ${
              isLight
                ? 'bg-[#FAF7F2] hover:bg-[#B8860B] hover:text-white text-[#231F1D] border-[#E5DEC9]'
                : 'bg-[#0C0805] hover:bg-[#d4af37] hover:text-[#0C0805] text-white border-amber-950/60'
            }`}
            title="Quay về trang chủ"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Trang Chủ</span>
          </button>

          <div className="h-6 w-px bg-amber-950/40 hidden sm:block" />

          {/* Destination Title & Status */}
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#d4af37] shrink-0" />
            <h1 className="text-base sm:text-lg font-extrabold font-serif truncate">
              Lịch Trình Tối Ưu: <span className="text-[#d4af37]">{plan.destination?.name || 'Chuyến Đi'}</span>
            </h1>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/30">
              Đã Tối Ưu Tự Động
            </span>
          </div>
        </div>

        {/* Action Buttons: PDF Exporter & Complete Trip */}
        <div className="flex items-center gap-3 shrink-0">
          <InfographicExporter
            plan={plan}
          />

          <button
            onClick={onBackToHome}
            className={`px-4 py-2 rounded-2xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md border ${
              isLight
                ? 'bg-[#B8860B] hover:bg-[#a07509] text-white border-[#B8860B]'
                : 'bg-[#d4af37] hover:bg-amber-400 text-[#0C0805] border-[#d4af37]'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Hoàn Tất Chuyến Đi</span>
          </button>
        </div>
      </header>

      {/* FULL SCREEN EDGE-TO-EDGE INDEPENDENT SCROLLING SPLIT-PANEL WORKSPACE */}
      <div
        ref={containerRef}
        className="flex-1 flex flex-col lg:flex-row w-full h-[calc(100vh-64px)] overflow-hidden relative"
      >
        {/* LEFT PANEL: Independent Scroll (Activity Inspection Panel & Budget Dashboard) */}
        <div
          style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${leftWidth}%` : '100%' }}
          className="h-full overflow-y-auto p-6 space-y-6 custom-scrollbar shrink-0 border-b lg:border-b-0 border-amber-950/40"
        >
          {/* 1. DEDICATED LIVE ACTIVITY INSPECTION & ILLUSTRATION VIEWER PANEL (REPLACES MAP) */}
          <ActivityInspectionPanel
            service={inspectedService}
            destinationName={plan.destination?.name}
            onOpenSwapModal={() => {
              if (inspectedSelection && inspectedService) {
                handleOpenSwapModal(inspectedSelection, inspectedService);
              }
            }}
          />

          {/* 2. Ở DƯỚI: THÔNG SỐ NGÂN SÁCH VÀ CHI TIÊU */}
          <BudgetDashboard plan={plan} />

          {/* 3. GỢI Ý ĐIỂM ĐẾN TƯƠNG TỰ BASED ON TAG CLASSIFICATION */}
          <SimilarDestinationsWidget
            currentDestinationId={plan.destination?.id || selectedDest.id}
            onSelectDestination={onSelectDestination}
          />
        </div>

        {/* RESIZABLE DIVIDER SPLITTER HANDLE BAR */}
        <div
          onMouseDown={startResizing}
          className={`hidden lg:flex w-3 hover:w-4.5 cursor-col-resize items-center justify-center transition-all shrink-0 z-20 group select-none relative border-x ${
            isLight
              ? 'bg-[#FAF7F2] hover:bg-[#B8860B] border-[#E5DEC9]'
              : 'bg-[#0C0805] hover:bg-[#d4af37] border-amber-950/60'
          }`}
          title="Kéo sang trái/phải để điều chỉnh độ rộng giữa 2 bên khung"
        >
          <div className="w-1 h-10 rounded-full bg-slate-600 group-hover:bg-[#0C0805] transition-colors" />
        </div>

        {/* RIGHT PANEL: Independent Scroll (Timeline Lịch Trình Chi Tiết) */}
        <div
          style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${100 - leftWidth}%` : '100%' }}
          className="h-full overflow-y-auto p-6 space-y-6 custom-scrollbar flex-1"
        >
          <ItineraryTimeline
            plan={plan}
            onOpenSwapModal={handleOpenSwapModal}
            onInspectService={handleInspectService}
            activeServiceId={inspectedService?.id}
          />
        </div>
      </div>

      {/* 4.3 Swap Item Recommendation Modal */}
      {swapModalOpen && targetSelection && targetService && plan.plan_state && (
        <SwapItemModal
          isOpen={swapModalOpen}
          onClose={() => setSwapModalOpen(false)}
          planState={plan.plan_state}
          targetSelection={targetSelection}
          targetService={targetService}
          onSwapApplied={(updatedPlan) => {
            onPlanUpdated(updatedPlan);
            if (targetSelection) {
              const swappedDay = updatedPlan.daily_itinerary?.find((d) => d.day === targetSelection.day);
              const swappedEv = swappedDay?.events.find((e) => e.slot === targetSelection.slot);
              if (swappedEv) {
                setInspectedService(swappedEv);
              }
            }
          }}
        />
      )}
    </div>
  );
};
