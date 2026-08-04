import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, KeyRound, X, ShieldCheck, AlertCircle } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === 'admin123') {
      setError(false);
      setPasscode('');
      onSuccess();
    } else {
      setError(true);
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
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#d9f99d] border border-lime-300 flex items-center justify-center mx-auto text-slate-900 shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 font-sans">Đăng Nhập Quản Trị CMS</h3>
            <p className="text-xs text-slate-500 font-sans">
              Nhập mã xác thực để truy cập bảng điều khiển Elevate CMS.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Mật Khẩu Quản Trị
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setError(false);
                  }}
                  placeholder="Mật khẩu khởi tạo (admin123)..."
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
                  <span>Mật khẩu không chính xác! Thử lại với admin123</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
              <Lock className="w-4 h-4 text-lime-700 shrink-0" />
              <span>Bảo mật hệ thống CMS. Mật khẩu khởi tạo: <strong className="text-slate-900 font-extrabold">admin123</strong></span>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-[#d9f99d] hover:bg-lime-300 text-slate-900 font-extrabold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Truy Cập Bảng Quản Trị →
            </button>
          </form>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
