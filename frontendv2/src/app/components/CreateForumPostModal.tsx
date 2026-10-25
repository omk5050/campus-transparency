import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import { createForumPost, ForumPostDetail, ApiError } from '../api';
import { toast } from 'sonner';

interface CreateForumPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (post: ForumPostDetail) => void;
}

const C = {
  bg: '#08090E',
  surface: '#0F1117',
  surface2: '#161921',
  border: '#1E222B',
  border2: '#2D3140',
  cyan: '#00C8E8',
  text: '#E2E5EE',
  textSub: '#8A8FA8',
  textDim: '#52576A',
  red: '#EF4444',
};

const CATEGORIES = [
  { value: 'GENERAL', label: 'General Discussion', desc: 'Open campus community topics' },
  { value: 'SUGGESTION', label: 'Suggestion', desc: 'Constructive improvements & ideas' },
  { value: 'QUESTION', label: 'Question', desc: 'Ask fellow members for advice or info' },
  { value: 'DISCUSSION', label: 'Discussion', desc: 'Debate and collaborative thinking' },
  { value: 'FEEDBACK', label: 'Feedback', desc: 'Feedback on campus services or initiatives' },
];

export function CreateForumPostModal({ isOpen, onClose, onSuccess }: CreateForumPostModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title cannot be blank');
      return;
    }
    if (!content.trim()) {
      setError('Content cannot be blank');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const created = await createForumPost({
        title: title.trim(),
        category,
        content: content.trim(),
      });
      toast.success('Discussion posted successfully');
      setTitle('');
      setContent('');
      setCategory('GENERAL');
      onSuccess(created);
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 429) {
        setError('Rate limit exceeded: You can create a maximum of 5 posts per hour. Please wait before posting again.');
      } else {
        setError(err.message || 'Failed to create discussion');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-xl border rounded-lg overflow-hidden shadow-2xl"
        style={{ background: C.surface, borderColor: C.border2 }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ background: C.surface2, borderColor: C.border }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ background: `${C.cyan}18`, color: C.cyan }}
            >
              <MessageSquare size={16} />
            </div>
            <div>
              <h2 className="font-mono text-sm font-semibold tracking-wide" style={{ color: C.text }}>
                Start a New Discussion
              </h2>
              <p className="font-mono text-[11px]" style={{ color: C.textSub }}>
                Share ideas, suggestions, and questions with your campus community
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            style={{ color: C.textSub }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content notice */}
        <div
          className="px-6 py-2.5 border-b text-xs font-mono flex items-center gap-2"
          style={{ background: '#121620', borderColor: C.border, color: C.textSub }}
        >
          <Sparkles size={13} className="text-cyan-400 flex-shrink-0" />
          <span>
            Posted under your safe public identity: <strong className="text-cyan-300">Member #Alias</strong>. No personal data or complaint records are exposed.
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              className="p-3 border rounded text-xs font-mono flex items-start gap-2"
              style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: C.red, color: '#FCA5A5' }}
            >
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-mono text-xs uppercase tracking-wider mb-1.5" style={{ color: C.textSub }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded font-mono text-xs focus:outline-none transition-colors"
              style={{
                background: C.surface2,
                borderColor: C.border,
                color: C.text,
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label} — {cat.desc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-wider mb-1.5" style={{ color: C.textSub }}>
              Discussion Title *
            </label>
            <input
              type="text"
              required
              maxLength={200}
              placeholder="e.g., Improved extended hours for the main library during exams"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded font-mono text-xs focus:outline-none transition-colors"
              style={{
                background: C.surface2,
                borderColor: C.border,
                color: C.text,
              }}
            />
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-wider mb-1.5" style={{ color: C.textSub }}>
              Content / Explanation *
            </label>
            <textarea
              required
              rows={6}
              maxLength={5000}
              placeholder="Describe your suggestion, question, or discussion point in detail..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border rounded font-mono text-xs focus:outline-none transition-colors resize-y"
              style={{
                background: C.surface2,
                borderColor: C.border,
                color: C.text,
              }}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="font-mono text-[10px]" style={{ color: C.textDim }}>
                Plain text formatting. Maximum 5,000 characters.
              </span>
              <span className="font-mono text-[10px]" style={{ color: C.textDim }}>
                {content.length} / 5000
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t flex items-center justify-end gap-3" style={{ borderColor: C.border }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border rounded font-mono text-xs uppercase tracking-wider hover:bg-white/5 transition-colors"
              style={{ borderColor: C.border, color: C.textSub }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
              className="px-5 py-2 rounded font-mono text-xs uppercase tracking-wider font-semibold transition-opacity disabled:opacity-40 hover:opacity-90 flex items-center gap-2"
              style={{ background: C.cyan, color: C.bg }}
            >
              {loading ? 'Publishing...' : 'Publish Discussion'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
