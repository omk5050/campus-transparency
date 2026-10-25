import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Search,
  Plus,
  Filter,
  Lock,
  Clock,
  Building2,
  Sparkles,
  ArrowRight,
  Shield,
  HelpCircle,
  Lightbulb,
  MessageCircle,
  ThumbsUp,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import {
  ForumPostSummary,
  getPublicForumPosts,
  getVisibleForumPosts,
  isAuthenticated,
  SpringPage,
} from '../api';
import { CreateForumPostModal } from './CreateForumPostModal';
import { ForumPostDetailView } from './ForumPostDetail';

interface PublicForumProps {
  onBack?: () => void;
  isAdmin?: boolean;
  initialPostId?: number;
}

const C = {
  bg: '#08090E',
  surface: '#0F1117',
  surface2: '#161921',
  surface3: '#1D2029',
  border: '#1E222B',
  border2: '#2D3140',
  cyan: '#00C8E8',
  text: '#E2E5EE',
  textSub: '#8A8FA8',
  textDim: '#52576A',
  emerald: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  purple: '#8B5CF6',
};

const CATEGORIES = [
  { key: 'ALL', label: 'All Discussions' },
  { key: 'GENERAL', label: 'General' },
  { key: 'SUGGESTION', label: 'Suggestions' },
  { key: 'QUESTION', label: 'Questions' },
  { key: 'DISCUSSION', label: 'Discussions' },
  { key: 'FEEDBACK', label: 'Feedback' },
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  GENERAL: { bg: 'rgba(56, 189, 248, 0.1)', text: '#38BDF8', border: 'rgba(56, 189, 248, 0.3)' },
  SUGGESTION: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' },
  QUESTION: { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
  DISCUSSION: { bg: 'rgba(139, 92, 246, 0.1)', text: '#8B5CF6', border: 'rgba(139, 92, 246, 0.3)' },
  FEEDBACK: { bg: 'rgba(244, 63, 94, 0.1)', text: '#F43F5E', border: 'rgba(244, 63, 94, 0.3)' },
};

export function PublicForum({ onBack, isAdmin, initialPostId }: PublicForumProps) {
  const [postsPage, setPostsPage] = useState<SpringPage<ForumPostSummary> | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(initialPostId ?? null);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const authenticated = isAuthenticated();

  const loadPosts = async () => {
    setLoading(true);
    try {
      const catParam = category === 'ALL' ? undefined : category;
      const searchParam = search.trim() ? search.trim() : undefined;

      if (authenticated) {
        const res = await getVisibleForumPosts({
          category: catParam,
          search: searchParam,
          page,
          size: 10,
        });
        setPostsPage(res);
      } else {
        const res = await getPublicForumPosts({
          category: catParam,
          search: searchParam,
          page,
          size: 10,
        });
        setPostsPage(res);
      }
    } catch (err) {
      console.error('Failed to load forum posts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [category, page, search]);

  // If a post is selected, render the detail view
  if (selectedPostId !== null) {
    return (
      <ForumPostDetailView
        postId={selectedPostId}
        onBack={() => {
          setSelectedPostId(null);
          loadPosts();
        }}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Top Bar with Back option */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 font-mono text-xs hover:text-cyan-400 transition-colors"
          style={{ color: C.textSub }}
        >
          <ArrowLeft size={14} /> Back
        </button>
      )}

      {/* Header Banner */}
      <div
        className="relative overflow-hidden border rounded-xl p-8"
        style={{
          background: `linear-gradient(135deg, ${C.surface} 0%, ${C.surface2} 100%)`,
          borderColor: C.border2,
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold"
                 style={{ background: `${C.cyan}15`, color: C.cyan, border: `1px solid ${C.cyan}30` }}>
              <MessageSquare size={13} />
              <span>Decentralized Campus Forum</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-mono tracking-tight text-white">
              Public Community Discussions
            </h1>
            <p className="font-mono text-xs md:text-sm leading-relaxed" style={{ color: C.textSub }}>
              An open, transparent space for student discussions, ideas, feedback, and questions.
              Completely decoupled from the private anonymous complaint resolution system.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {authenticated ? (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-2.5 rounded-lg font-mono text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02]"
                style={{ background: C.cyan, color: C.bg }}
              >
                <Plus size={16} />
                <span>Start Discussion</span>
              </button>
            ) : (
              <div
                className="p-3 border rounded text-xs font-mono text-center"
                style={{ background: C.surface3, borderColor: C.border, color: C.textSub }}
              >
                <span>Sign in to post discussions & replies</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls Bar: Category Pills & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setCategory(cat.key);
                  setPage(0);
                }}
                className={`px-3 py-1.5 rounded-md font-mono text-xs font-medium whitespace-nowrap transition-all border ${
                  isSelected ? 'border-cyan-400 text-white' : 'hover:bg-white/5'
                }`}
                style={{
                  background: isSelected ? `${C.cyan}15` : 'transparent',
                  borderColor: isSelected ? C.cyan : C.border,
                  color: isSelected ? C.cyan : C.textSub,
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textDim }} />
          <input
            type="text"
            placeholder="Search discussions..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-9 pr-4 py-1.5 border rounded-md font-mono text-xs focus:outline-none transition-colors"
            style={{
              background: C.surface,
              borderColor: C.border,
              color: C.text,
            }}
          />
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 font-mono text-xs" style={{ color: C.textSub }}>
            <RefreshCw size={24} className="animate-spin text-cyan-400 mb-2" />
            <span>Loading community discussions...</span>
          </div>
        ) : !postsPage || postsPage.content.length === 0 ? (
          <div
            className="border rounded-xl p-12 text-center font-mono space-y-3"
            style={{ background: C.surface, borderColor: C.border }}
          >
            <MessageSquare size={36} className="mx-auto text-zinc-600" />
            <h3 className="text-sm font-semibold text-white">No discussions found</h3>
            <p className="text-xs" style={{ color: C.textSub }}>
              {search || category !== 'ALL'
                ? 'Try adjusting your search query or category filter.'
                : 'Be the first community member to start a discussion!'}
            </p>
          </div>
        ) : (
          postsPage.content.map((p) => {
            const catStyle = CATEGORY_STYLES[p.category] || CATEGORY_STYLES.GENERAL;
            return (
              <motion.div
                key={p.id}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedPostId(p.id)}
                className="cursor-pointer border rounded-lg p-5 transition-all hover:border-zinc-700 shadow-sm"
                style={{ background: C.surface, borderColor: C.border }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border"
                      style={{ background: catStyle.bg, color: catStyle.text, borderColor: catStyle.border }}
                    >
                      {p.category}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] font-mono" style={{ color: C.textDim }}>
                      <Building2 size={11} />
                      <span>{p.organizationName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-mono" style={{ color: C.textDim }}>
                    <div className="flex items-center gap-1">
                      <Clock size={11} />
                      <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                    {p.locked && (
                      <span className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30">
                        <Lock size={10} /> Locked
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-mono text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                  {p.title}
                </h3>

                <p className="font-mono text-xs line-clamp-2 mt-1.5" style={{ color: C.textSub }}>
                  {p.snippet}
                </p>

                <div className="flex items-center justify-between pt-3 mt-3 border-t text-[11px] font-mono" style={{ borderColor: C.border }}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-cyan-300">{p.authorAlias}</span>
                    <span className="text-[10px]" style={{ color: C.textDim }}>Community Member</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold">
                    <MessageCircle size={13} />
                    <span>{p.replyCount} {p.replyCount === 1 ? 'reply' : 'replies'}</span>
                    <ArrowRight size={12} className="ml-1" />
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {postsPage && postsPage.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 font-mono text-xs">
          <span style={{ color: C.textDim }}>
            Page {page + 1} of {postsPage.totalPages} ({postsPage.totalElements} discussions)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 border rounded hover:bg-white/5 disabled:opacity-40 transition-colors"
              style={{ borderColor: C.border, color: C.textSub }}
            >
              Previous
            </button>
            <button
              disabled={page + 1 >= postsPage.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border rounded hover:bg-white/5 disabled:opacity-40 transition-colors"
              style={{ borderColor: C.border, color: C.textSub }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <CreateForumPostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(created) => {
          setSelectedPostId(created.id);
        }}
      />
    </div>
  );
}
