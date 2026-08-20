import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose?: () => void;
  onCancel?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  isDanger = true,
  onConfirm,
  onClose,
  onCancel
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    } else if (typeof onCancel === 'function') {
      onCancel();
    }
  };

  const handleConfirm = () => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
    handleClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl shadow-2xl overflow-hidden z-10 p-6"
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isDanger ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">{message}</p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white bg-[#151518] hover:bg-[#1f1f23] transition-colors border border-[#1f1f23] cursor-pointer"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all transform active:scale-95 cursor-pointer ${
                    isDanger
                      ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-900/30'
                      : 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black shadow-lg shadow-yellow-900/30'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="absolute top-4 left-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#151518] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
