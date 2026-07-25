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
          className="fixed inset-0 bg-[#0C0805]/90 backdrop-blur-md z-[999998]"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          className="relative w-full max-w-2xl bg-[#14100c] border-2 border-[#d4af37]/50 rounded-3xl overflow-hidden shadow-2xl z-[999999] my-auto text-white font-sans flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 bg-[#0C0805] border-b border-amber-950/60 flex items-center justify-between gap-4 shrink-0">
            <div>
              <h3 className="text-xl font-bold font-serif text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-[#d4af37]" />
                Thay Đổi Địa Điểm Lịch Trình
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Đang đổi địa điểm cho khung giờ{' '}
                <span className="text-[#d4af37] font-bold">
                  {targetSelection.slot.toUpperCase()}
                </span>{' '}
                {targetSelection.day > 0 ? `- Ngày ${targetSelection.day}` : ''}
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#14100c] hover:bg-[#d4af37] hover:text-[#0C0805] text-white flex items-center justify-center border border-amber-950/60 transition-all cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Selected Item Banner */}
          <div className="p-4 bg-[#0C0805] border-b border-amber-950/40 flex items-center gap-3">
            <img
              src={targetService.image_url}
              alt={targetService.name}
              className="w-14 h-14 rounded-xl object-cover border border-amber-950/50 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest block">
                Địa điểm hiện tại:
              </span>
              <span className="font-bold text-sm text-white truncate block">
                {targetService.name}
              </span>
              <span className="text-xs text-[#d4af37] font-bold block">
                {targetService.total_cost_vnd.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          {/* Candidate List */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-[#14100c]">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block">
              Gợi ý ~5 địa điểm thay thế cùng ngân sách:
            </span>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <div className="animate-spin w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full mx-auto mb-2" />
                Đang tìm các địa điểm phù hợp trong cơ sở dữ liệu...
              </div>
            ) : candidates.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-[#0C0805] rounded-2xl border border-amber-950/40">
                Không tìm thấy thêm địa điểm thay thế khác phù hợp trong khung ngân sách này.
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="p-4 bg-[#0C0805] rounded-2xl border border-amber-950/40 hover:border-[#d4af37]/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={candidate.image_url}
                        alt={candidate.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-amber-950/50 shrink-0"
                      />
                      <div>
                        <h4 className="font-bold text-sm text-white font-serif">
                          {candidate.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400" /> {candidate.rating}
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">
                            {candidate.duration_hours} giờ
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {candidate.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      <span className="font-extrabold text-sm text-[#d4af37]">
                        {candidate.total_cost_vnd.toLocaleString('vi-VN')} đ
                      </span>

                      <button
                        onClick={() => handleApplySwap(candidate.id)}
                        disabled={applyingId === candidate.id}
                        className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-amber-400 text-[#0C0805] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                      >
                        {applyingId === candidate.id ? (
                          <div className="animate-spin w-3.5 h-3.5 border-2 border-[#0C0805] border-t-transparent rounded-full" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Đổi Địa Điểm Này</span>
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
