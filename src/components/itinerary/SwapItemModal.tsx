import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Star, CheckCircle, ExternalLink } from 'lucide-react';
import {
  PlanSelection,
  PlanState,
  PlanServiceItem,
  MaterializedPlan,
} from '../../types';
import { getSwapOptionsApi, applySwapApi } from '../../services/api';
import { useData } from '../../context/DataContext';

interface SwapItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  planState: PlanState;
  targetSelection: PlanSelection;
  targetService: PlanServiceItem;
  onSwapApplied: (updatedPlan: MaterializedPlan) => void;
}

export const SwapItemModal: React.FC<SwapItemModalProps> = ({
  isOpen,
  onClose,
  planState,
  targetSelection,
  targetService,
  onSwapApplied,
}) => {
  const { theme } = useData();
  const isLight = theme === 'light';

  const [candidates, setCandidates] = useState<PlanServiceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    getSwapOptionsApi({
      plan_state: planState,
      target: targetSelection,
    })
      .then((res) => {
        if (isMounted && res && Array.isArray(res.alternatives)) {
          setCandidates(res.alternatives);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, planState, targetSelection]);

  const handleApplySwap = async (replacementServiceId: string) => {
    setApplyingId(replacementServiceId);
    try {
      const updatedPlan = await applySwapApi({
        plan_state: planState,
        target: targetSelection,
        replacement_service_id: replacementServiceId,
      });

      if (updatedPlan && updatedPlan.status === 'success') {
        onSwapApplied(updatedPlan);
        onClose();
      }
    } catch (err) {
      console.error('Error applying swap:', err);
    } finally {
      setApplyingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md z-[999998]"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          className={`relative w-full max-w-2xl border-2 rounded-3xl overflow-hidden shadow-2xl z-[999999] my-auto font-sans flex flex-col max-h-[85vh] transition-colors duration-500 ${
            isLight
              ? 'bg-[#FAF7F2] border-[#B8860B]/60 text-[#231F1D]'
              : 'bg-[#14100c] border-[#d4af37]/50 text-white'
          }`}
        >
          {/* Header */}
          <div className={`p-6 border-b flex items-center justify-between gap-4 shrink-0 ${
            isLight ? 'bg-white border-[#E5DEC9]' : 'bg-[#0C0805] border-amber-950/60'
          }`}>
            <div>
              <h3 className={`text-xl font-bold font-serif flex items-center gap-2 ${isLight ? 'text-[#231F1D]' : 'text-white'}`}>
                <RefreshCw className={`w-5 h-5 ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`} />
                Thay Đổi Địa Điểm Lịch Trình
              </h3>
              <p className={`text-xs mt-1 font-sans ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Đang đổi địa điểm cho khung giờ{' '}
                <span className={`font-bold ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`}>
                  {targetSelection.slot.toUpperCase()}
                </span>{' '}
                {targetSelection.day > 0 ? `- Ngày ${targetSelection.day}` : ''}
              </p>
            </div>

            <button
              onClick={onClose}
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                isLight
                  ? 'bg-[#FAF7F2] hover:bg-[#B8860B] hover:text-white text-[#231F1D] border-[#E5DEC9]'
                  : 'bg-[#14100c] hover:bg-[#d4af37] hover:text-[#0C0805] text-white border-amber-950/60'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Selected Item Banner */}
          <div className={`p-4 border-b flex items-center gap-3 ${
            isLight ? 'bg-[#FAF7F2] border-[#E5DEC9]' : 'bg-[#0C0805] border-amber-950/40'
          }`}>
            <img
              src={targetService.image_url}
              alt={targetService.name}
              className={`w-14 h-14 rounded-xl object-cover border shrink-0 ${isLight ? 'border-[#E5DEC9]' : 'border-amber-950/50'}`}
            />
            <div className="flex-1 min-w-0">
              <span className={`text-[10px] font-bold uppercase tracking-widest block ${isLight ? 'text-[#B8860B]' : 'text-amber-400'}`}>
                Địa điểm hiện tại:
              </span>
              <span className={`font-bold text-sm truncate block ${isLight ? 'text-[#231F1D]' : 'text-white'}`}>
                {targetService.name}
              </span>
              <span className={`text-xs font-bold block ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`}>
                {targetService.total_cost_vnd.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          {/* Candidate List */}
          <div className={`p-6 space-y-4 overflow-y-auto flex-1 ${isLight ? 'bg-white' : 'bg-[#14100c]'}`}>
            <span className={`text-xs font-bold uppercase tracking-widest block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Gợi ý ~5 địa điểm thay thế cùng ngân sách:
            </span>

            {loading ? (
              <div className={`py-12 text-center text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <div className={`animate-spin w-6 h-6 border-2 border-t-transparent rounded-full mx-auto mb-2 ${
                  isLight ? 'border-[#B8860B]' : 'border-[#d4af37]'
                }`} />
                Đang tìm các địa điểm phù hợp trong cơ sở dữ liệu...
              </div>
            ) : candidates.length === 0 ? (
              <div className={`py-8 text-center text-xs rounded-2xl border ${
                isLight ? 'bg-[#FAF7F2] border-[#E5DEC9] text-slate-600' : 'bg-[#0C0805] border-amber-950/40 text-slate-400'
              }`}>
                Không tìm thấy thêm địa điểm thay thế khác phù hợp trong khung ngân sách này.
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isLight
                        ? 'bg-[#FAF7F2] border-[#E5DEC9] hover:border-[#B8860B]/60'
                        : 'bg-[#0C0805] border-amber-950/40 hover:border-[#d4af37]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={candidate.image_url}
                        alt={candidate.name}
                        className={`w-16 h-16 rounded-2xl object-cover border shrink-0 ${isLight ? 'border-[#E5DEC9]' : 'border-amber-950/50'}`}
                      />
                      <div>
                        <h4 className={`font-bold text-sm font-serif ${isLight ? 'text-[#231F1D]' : 'text-white'}`}>
                          {candidate.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className="text-amber-500 font-bold flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" /> {candidate.rating}
                          </span>
                          <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>•</span>
                          <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                            {candidate.duration_hours} giờ
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-950/20">
                      <div className="text-left sm:text-right">
                        <span className={`text-[10px] block uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          Chi phí
                        </span>
                        <span className={`font-black text-sm font-serif ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`}>
                          {candidate.total_cost_vnd.toLocaleString('vi-VN')} đ
                        </span>
                      </div>

                      <button
                        onClick={() => handleApplySwap(candidate.id)}
                        disabled={applyingId === candidate.id}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer ${
                          applyingId === candidate.id
                            ? 'bg-slate-700 text-slate-300'
                            : isLight
                            ? 'bg-[#B8860B] hover:bg-[#a07509] text-white'
                            : 'bg-[#d4af37] hover:bg-amber-400 text-[#0C0805]'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{applyingId === candidate.id ? 'Đang Đổi...' : 'Chọn Đổi'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
