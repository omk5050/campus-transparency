import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ArrowRight, Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Signal, SignalStatus } from '../types';
import { clsx } from 'clsx';
import { StatusBadge } from './StatusBadge';

interface SubmitSignalProps {
  onClose: () => void;
  onSubmit: (signal: Partial<Signal>) => void;
}

type FormValues = {
  title: string;
  description: string;
};

export function SubmitSignal({ onClose, onSubmit }: SubmitSignalProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>();
  const [isPreview, setIsPreview] = useState(false);
  const title = watch('title', '');
  const description = watch('description', '');

  const onSubmitForm = (data: FormValues) => {
    onSubmit({
      ...data,
      status: 'REPORTED',
      trending: false,
      hot: false,
      voteCount: 1,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="fixed inset-0 z-50 bg-[#0B0F14] flex flex-col"
    >
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <h2 className="text-xl font-mono uppercase tracking-widest text-[#00E5FF]">
          &gt; Initiate New Signal
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
          <X size={24} />
        </button>
      </div>

      <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden">
        {/* Input Side */}
        <div className={clsx(
          "flex-1 p-8 md:p-12 overflow-y-auto transition-all duration-500",
          isPreview ? "opacity-50 pointer-events-none md:pointer-events-auto md:opacity-100" : "opacity-100"
        )}>
          <form onSubmit={handleSubmit(onSubmitForm)} className="max-w-2xl mx-auto space-y-12">
            
            <div className="space-y-4">
              <label className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
                01. Signal Title ({title.length}/60)
              </label>
              <input
                {...register('title', { required: true, maxLength: 60 })}
                placeholder="Briefly state the issue..."
                className="w-full bg-transparent border-b-2 border-white/20 text-3xl md:text-5xl font-serif text-[#E0E0E0] placeholder-white/10 focus:outline-none focus:border-[#00E5FF] transition-colors pb-4"
                autoFocus
              />
              {errors.title && <span className="text-rose-500 text-xs font-mono">Required (max 60 chars)</span>}
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
                02. Detailed Report ({description.length}/500)
              </label>
              <textarea
                {...register('description', { required: true, maxLength: 500 })}
                rows={6}
                placeholder="Describe the context, location, and impact..."
                className="w-full bg-transparent border border-white/20 p-6 text-lg font-mono text-white/80 placeholder-white/10 focus:outline-none focus:border-[#00E5FF] transition-colors rounded-none resize-none leading-relaxed"
              />
              {errors.description && <span className="text-rose-500 text-xs font-mono">Required (max 500 chars)</span>}
            </div>

            <div className="pt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsPreview(!isPreview)}
                className="flex items-center space-x-2 text-white/40 hover:text-white transition-colors font-mono text-sm uppercase tracking-wider"
              >
                <Eye size={18} />
                <span>{isPreview ? "Hide Preview" : "Show Preview"}</span>
              </button>

              <button
                type="submit"
                className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#00E5FF] hover:bg-[#00B8CC] text-[#0B0F14] font-bold uppercase tracking-wider transition-all active:scale-95 overflow-hidden"
              >
                <span className="relative z-10 flex items-center">
                  Transmit Signal <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </div>

          </form>
        </div>

        {/* Preview Side */}
        {isPreview && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="flex-1 border-l border-white/10 bg-[#0B0F14]/50 p-8 md:p-12 overflow-y-auto hidden md:block"
          >
             <div className="max-w-xl mx-auto opacity-80 pointer-events-none select-none">
                <div className="mb-8 font-mono text-xs uppercase text-[#00E5FF] tracking-widest border border-[#00E5FF] inline-block px-2 py-1">
                   Preview Mode
                </div>
                <h2 className="text-4xl font-serif text-[#E0E0E0] mb-6 leading-tight">{title || "Untitled Signal"}</h2>
                <div className="mb-8">
                   <StatusBadge status="REPORTED" />
                </div>
                <p className="font-mono text-white/70 leading-loose border-l-2 border-white/10 pl-6">
                   {description || "No description provided yet..."}
                </p>
             </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
