import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  MapPin,
  CheckCircle,
  Sparkles,
  Compass,
  X,
  Sliders,
} from 'lucide-react';
import {
  Destination,
  MaterializedPlan,
  GeneratePlanRequest,
  PlanSelection,
  PlanServiceItem,
  UserPreferences,
} from '../../types';
import { generatePlanApi } from '../../services/api';
import { MapboxMap } from '../common/MapboxMap';
import { TripConfigForm } from './TripConfigForm';
import { BudgetDashboard } from './BudgetDashboard';
import { ItineraryTimeline } from './ItineraryTimeline';
import { SwapItemModal } from './SwapItemModal';
import { InfographicExporter } from '../common/InfographicExporter';
import { SimilarDestinationsWidget } from '../destination/SimilarDestinationsWidget';
import { useData } from '../../context/DataContext';

interface ItineraryCanvasProps {
  selectedDestination: Destination;
  allDestinations: Destination[];
  onSelectDestination: (dest: Destination) => void;
  onPlanGenerated: (plan: MaterializedPlan) => void;
  totalBudget?: number;
  setTotalBudget?: (val: number) => void;
  numDays?: number;
  setNumDays?: (val: number) => void;
  preferences?: UserPreferences;
  setPreferences?: React.Dispatch<React.SetStateAction<UserPreferences>>;
  result?: any;
  loading?: boolean;
  onRecalculate?: () => void;
}

export const ItineraryCanvas: React.FC<ItineraryCanvasProps> = ({
  selectedDestination,
  allDestinations,
  onSelectDestination,
  onPlanGenerated,
}) => {
  const { theme } = useData();
  const isLight = theme === 'light';

  // Toggle Form Card Popup Modal State
  const [showFormModal, setShowFormModal] = useState<boolean>(false);

  // Materialized Plan Result State (initially null - no pre-rendered itinerary)
  const [materializedPlan, setMaterializedPlan] = useState<MaterializedPlan | null>(null);
  const [planLoading, setPlanLoading] = useState<boolean>(false);
  const [infeasibleError, setInfeasibleError] = useState<string | null>(null);

  // Swap Modal State
  const [swapModalOpen, setSwapModalOpen] = useState<boolean>(false);
  const [targetSelection, setTargetSelection] = useState<PlanSelection | null>(null);
  const [targetService, setTargetService] = useState<PlanServiceItem | null>(null);

  // Handler triggered ONLY when user fills form inside Pop-up Card and clicks "Tạo Lịch Trình"
  const handleGeneratePlan = async (req: GeneratePlanRequest) => {
    setPlanLoading(true);
    setInfeasibleError(null);

    try {
      const plan = await generatePlanApi(req);

      if (plan.status === 'infeasible') {
        setInfeasibleError(
          plan.message ||
            'Ngân sách hiện tại không đủ để xây dựng lịch trình phù hợp. Vui lòng tăng ngân sách hoặc rút ngắn thời gian chuyến đi.'
        );
      } else if (plan.status === 'success') {
        setMaterializedPlan(plan);
        setInfeasibleError(null);
        setShowFormModal(false); // Close Form Popup Card Modal on success!

        // Update selected destination map if destination changed
        const matched = allDestinations.find((d) => d.id === req.destination_id);
        if (matched) {
          onSelectDestination(matched);
        }

        // Navigate to /result route!
        onPlanGenerated(plan);
      }
    } catch (err: any) {
      console.error('Error generating plan:', err);
      setInfeasibleError(
        'Đã xảy ra lỗi trong quá trình tối ưu lịch trình. Vui lòng thử lại.'
      );
    } finally {
      setPlanLoading(false);
    }
  };

  const handleOpenSwapModal = (target: PlanSelection, service: PlanServiceItem) => {
    if (!materializedPlan?.plan_state) return;
    setTargetSelection(target);
    setTargetService(service);
    setSwapModalOpen(true);
  };

  const handleCompleteTrip = () => {
    setMaterializedPlan(null);
    setShowFormModal(false);
    const canvasElem = document.getElementById('canvas');
    if (canvasElem) {
      canvasElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.section
      id="canvas"
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, amount: 0.1 }}
      className={`py-20 px-4 sm:px-8 max-w-7xl mx-auto space-y-12 font-sans transition-colors duration-500 ${
        isLight ? 'bg-[#FAF7F2] text-[#231F1D]' : 'bg-[#0C0805] text-white'
      }`}
    >
      {/* LUXURY BANNER WITH "TẠO LỊCH TRÌNH CỦA RIÊNG BẠN" CTA BUTTON */}
      <div
        className={`rounded-3xl p-8 sm:p-12 border shadow-2xl transition-all duration-500 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden ${
          isLight
            ? 'bg-gradient-to-r from-amber-50 via-white to-amber-50/50 border-[#E5DEC9]'
            : 'bg-gradient-to-r from-[#14100c] via-[#1a140f] to-[#0C0805] border-amber-950/80'
        }`}
      >
        <div className="space-y-4 max-w-2xl text-center md:text-left z-10">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-extrabold tracking-wider uppercase font-sans ${
              isLight
                ? 'bg-white border-[#D4C5A9] text-[#B8860B]'
                : 'bg-[#0C0805] border-[#d4af37]/40 text-[#d4af37]'
            }`}
          >
            <Compass className="w-4 h-4 text-[#d4af37]" />
            <span>TripBuddy AI — Tối Ưu Hóa Kế Hoạch Du Lịch</span>
          </div>

          <h2
            className={`text-3xl sm:text-5xl font-extrabold font-serif tracking-tight leading-tight ${
              isLight ? 'text-[#231F1D]' : 'text-white'
            }`}
          >
            Tạo Lịch Trình <span className={isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}>Của Riêng Bạn</span>
          </h2>

          <p
            className={`text-sm sm:text-base font-sans leading-relaxed ${
              isLight ? 'text-[#665E55]' : 'text-slate-300'
            }`}
          >
            Bấm vào nút bên dưới để mở Form điền ngân sách, điểm đến, số người & ưu tiên sở thích cá nhân. Thuật toán sẽ tối ưu lịch trình chi tiết tự động cho bạn.
          </p>
        </div>

        {/* PROMINENT CTA BUTTON TO POP UP THE FORM CARD MODAL */}
        <div className="shrink-0 z-10">
          <button
            onClick={() => setShowFormModal(true)}
            className={`px-8 py-5 rounded-2xl font-extrabold text-sm uppercase tracking-[0.15em] shadow-2xl transition-all duration-300 flex items-center gap-3 cursor-pointer hover:scale-105 active:scale-95 border ${
              isLight
                ? 'bg-[#B8860B] hover:bg-[#9E7B1A] text-white border-[#B8860B]'
                : 'bg-[#d4af37] hover:bg-amber-400 text-[#0C0805] border-[#d4af37] shadow-amber-500/20'
            }`}
          >
            <Sparkles className="w-5 h-5 fill-current" />
            <span>Tạo Lịch Trình Của Riêng Bạn</span>
          </button>
        </div>
      </div>

      {/* POP-UP FORM CARD OVERLAY MODAL */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFormModal(false)}
              className="fixed inset-0 bg-[#0C0805]/90 backdrop-blur-md z-[99998]"
            />

            {/* Pop-up Card Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 25 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`relative w-full max-w-6xl border-2 rounded-3xl overflow-hidden shadow-2xl z-[99999] my-auto font-sans max-h-[92vh] flex flex-col ${
                isLight
                  ? 'bg-[#FAF7F2] text-[#231F1D] border-[#B8860B]/40'
                  : 'bg-[#14100c] text-white border-[#d4af37]/60'
              }`}
            >
              {/* Modal Top Bar Header */}
              <div
                className={`p-6 border-b flex items-center justify-between gap-4 shrink-0 ${
                  isLight
                    ? 'bg-white border-[#E5DEC9] text-[#231F1D]'
                    : 'bg-[#0C0805] border-amber-950/60 text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sliders
                    className={`w-5 h-5 ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`}
                  />
                  <div>
                    <h3
                      className={`text-xl font-bold font-serif ${
                        isLight ? 'text-[#231F1D]' : 'text-white'
                      }`}
                    >
                      Điền Thông Tin Lập Lịch Trình
                    </h3>
                    <p
                      className={`text-xs font-sans ${
                        isLight ? 'text-[#665E55]' : 'text-slate-400'
                      }`}
                    >
                      Nhập thông tin cơ bản, chọn gợi ý điểm đến & thiết lập mức ưu tiên chi phí
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowFormModal(false)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-lg shrink-0 ${
                    isLight
                      ? 'bg-[#FAF7F2] hover:bg-[#B8860B] hover:text-white text-[#231F1D] border-[#E5DEC9]'
                      : 'bg-[#14100c] hover:bg-[#d4af37] hover:text-[#0C0805] text-white border-amber-950/60'
                  }`}
                  title="Đóng Form"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Content Inside Card */}
              <div
                className={`p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 ${
                  isLight ? 'bg-[#FAF7F2]' : 'bg-[#14100c]'
                }`}
              >
                <TripConfigForm
                  onGeneratePlan={handleGeneratePlan}
                  loading={planLoading}
                  infeasibleError={infeasibleError}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OUTPUT RESULTS SECTION (RENDERED ONLY AFTER USER SUBMITS THE FORM) */}
      {materializedPlan && materializedPlan.status === 'success' && (
        <div className="space-y-12 pt-8 border-t border-amber-950/40" id="plan-results">
          {/* Top Bar with PDF Export & Complete Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-[#14100c] rounded-3xl border border-amber-950/60 shadow-xl">
            <div>
              <h3 className="text-lg font-bold text-white font-serif flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#d4af37]" />
                Lịch Trình Đã Được Tối Ưu Thành Công
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Bạn có thể xem phân bổ ngân sách, tùy chỉnh đổi địa điểm, xuất file PDF hoặc hoàn tất kế hoạch.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* PDF Exporter Button */}
              <InfographicExporter
                plan={materializedPlan}
              />

              {/* Complete Trip Button */}
              <button
                onClick={handleCompleteTrip}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Hoàn Tất Chuyến Đi</span>
              </button>
            </div>
          </div>

          {/* Mapbox Map View of Destination */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37] flex items-center gap-2 font-sans">
                <MapPin className="w-4 h-4 text-[#d4af37]" />
                Bản Đồ Vị Trí Lịch Trình: {materializedPlan.destination?.name}
              </h3>
            </div>
            <MapboxMap
              selectedDestination={selectedDestination}
              allDestinations={allDestinations}
              onSelectDestination={onSelectDestination}
            />
          </div>

          {/* Gợi Ý Điểm Đến Tương Tự Theo Thẻ Tag Classification Widget */}
          <SimilarDestinationsWidget
            currentDestinationId={materializedPlan.destination?.id || selectedDestination.id}
            onSelectDestination={onSelectDestination}
          />

          {/* 4.1 Budget Analytics Dashboard */}
          <BudgetDashboard plan={materializedPlan} />

          {/* 4.2 Daily Itinerary Timeline */}
          <ItineraryTimeline
            plan={materializedPlan}
            onOpenSwapModal={handleOpenSwapModal}
          />
        </div>
      )}

      {/* 4.3 Swap Item Recommendation Modal */}
      {swapModalOpen && targetSelection && targetService && materializedPlan?.plan_state && (
        <SwapItemModal
          isOpen={swapModalOpen}
          onClose={() => setSwapModalOpen(false)}
          planState={materializedPlan.plan_state}
          targetSelection={targetSelection}
          targetService={targetService}
          onSwapApplied={(updatedPlan) => {
            setMaterializedPlan(updatedPlan);
          }}
        />
      )}
    </motion.section>
  );
};
