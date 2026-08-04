import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, KeyRound, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { createAdminSession } from '../../services/neonDb';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passcode.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createAdminSession(passcode.trim());
      setError(false);
      setPasscode('');
      await onSuccess();
    } catch {
      setError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md font-sans text-slate-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-[32px] p-8 shadow-2xl space-y-6"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors p-1"
            aria-label="Đóng đăng nhập quản trị"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#d9f99d] border border-lime-300 flex items-center justify-center mx-auto text-slate-900 shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 font-sans">Đăng Nhập Quản Trị CMS</h3>
            <p className="text-xs text-slate-500 font-sans">Nhập mã quản trị để tạo phiên làm việc an toàn.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Mã Quản Trị
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(event) => {
                    setPasscode(event.target.value);
                    setError(false);
                  }}
                  placeholder="Nhập mã quản trị..."
                  className={`w-full bg-slate-50 border ${
                    error ? 'border-red-500' : 'border-slate-200 focus:border-lime-500'
                  } rounded-2xl px-4 py-3.5 pl-11 text-sm text-slate-900 focus:outline-none transition-colors font-sans`}
                  autoFocus
                />
                <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
              {error && (
                <div className="flex items-center gap-1.5 text-red-500 text-xs mt-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Mã quản trị không chính xác hoặc không thể tạo phiên.</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
              <Lock className="w-4 h-4 text-lime-700 shrink-0" />
              <span>Mã chỉ được gửi một lần qua HTTPS; sau đó API dùng cookie HTTP-only.</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-[#d9f99d] hover:bg-lime-300 disabled:opacity-60 text-slate-900 font-extrabold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {isSubmitting ? 'Đang xác thực...' : 'Truy Cập Bảng Quản Trị →'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
