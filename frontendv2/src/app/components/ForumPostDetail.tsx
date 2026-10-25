import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  MessageSquare,
  Lock,
  EyeOff,
  Clock,
  Send,
  Trash2,
  Edit2,
  AlertCircle,
  Building2,
  Shield,
  UserCheck,
  Check,
  X,
} from 'lucide-react';
import {
  ForumPostDetail as ForumPostDetailType,
  ForumReply,
  getPublicForumPost,
  getPublicForumReplies,
  getForumPostDetail,
  getForumReplies,
  createForumReply,
  updateForumReply,
  deleteForumReply,
  deleteForumPost,
  isAuthenticated,
  ApiError,
} from '../api';
import { toast } from 'sonner';

interface ForumPostDetailProps {
  postId: number;
  onBack: () => void;
  isAdmin?: boolean;
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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GENERAL: { bg: 'rgba(56, 189, 248, 0.1)', text: '#38BDF8', border: 'rgba(56, 189, 248, 0.3)' },
  SUGGESTION: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' },
  QUESTION: { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
  DISCUSSION: { bg: 'rgba(139, 92, 246, 0.1)', text: '#8B5CF6', border: 'rgba(139, 92, 246, 0.3)' },
  FEEDBACK: { bg: 'rgba(244, 63, 94, 0.1)', text: '#F43F5E', border: 'rgba(244, 63, 94, 0.3)' },
};

export function ForumPostDetailView({ postId, onBack, isAdmin }: ForumPostDetailProps) {
  const [post, setPost] = useState<ForumPostDetailType | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reply Composer
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Edit Reply inline
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const authenticated = isAuthenticated();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (authenticated) {
        const [postData, repliesData] = await Promise.all([
          getForumPostDetail(postId),
          getForumReplies(postId),
        ]);
        setPost(postData);
        setReplies(repliesData);
      } else {
        const [postData, repliesData] = await Promise.all([
          getPublicForumPost(postId),
          getPublicForumReplies(postId),
        ]);
        setPost(postData);
        setReplies(repliesData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load forum discussion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [postId]);

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setSubmittingReply(true);
    setReplyError(null);

    try {
      const newReply = await createForumReply(postId, { content: replyContent.trim() });
      setReplies((prev) => [...prev, newReply]);
      setReplyContent('');
      toast.success('Reply submitted');
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 429) {
        setReplyError('Rate limit exceeded: Maximum 20 replies per hour per member. Please wait.');
      } else {
        setReplyError(err.message || 'Failed to post reply');
      }
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this discussion post?')) return;
    try {
      await deleteForumPost(postId);
      toast.success('Discussion deleted');
      onBack();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete discussion');
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) return;
    try {
      await deleteForumReply(replyId);
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
      toast.success('Reply deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete reply');
    }
  };

  const handleSaveEditReply = async (replyId: number) => {
    if (!editContent.trim()) return;
    try {
      const updated = await updateForumReply(replyId, { content: editContent.trim() });
      setReplies((prev) => prev.map((r) => (r.id === replyId ? updated : r)));
      setEditingReplyId(null);
      setEditContent('');
      toast.success('Reply updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update reply');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 font-mono text-xs" style={{ color: C.textSub }}>
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
        <span>Loading discussion thread...</span>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 font-mono text-xs hover:text-cyan-400 transition-colors"
          style={{ color: C.textSub }}
        >
          <ArrowLeft size={14} /> Back to Forum
        </button>
        <div
          className="p-6 border rounded font-mono text-xs flex flex-col items-center text-center gap-3"
          style={{ background: C.surface, borderColor: C.border }}
        >
          <AlertCircle size={28} className="text-red-400" />
          <h3 className="text-sm font-semibold text-white">Discussion Unavailable</h3>
          <p style={{ color: C.textSub }}>{error || 'This discussion does not exist or has been removed.'}</p>
        </div>
      </div>
    );
  }

  const catStyle = CATEGORY_COLORS[post.category] || CATEGORY_COLORS.GENERAL;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 font-mono text-xs hover:text-cyan-400 transition-colors"
          style={{ color: C.textSub }}
        >
          <ArrowLeft size={15} /> Back to Discussions
        </button>

        {post.canEdit && (
          <button
            onClick={handleDeletePost}
            className="flex items-center gap-1.5 px-3 py-1.5 border rounded font-mono text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={13} />
            <span>Delete Post</span>
          </button>
        )}
      </div>

      {/* Main Post Card */}
      <div
        className="border rounded-lg overflow-hidden shadow-xl"
        style={{ background: C.surface, borderColor: C.border2 }}
      >
        {/* Banner if locked or hidden */}
        {post.locked && (
          <div
            className="px-6 py-2.5 border-b font-mono text-xs flex items-center gap-2"
            style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#FCD34D' }}
          >
            <Lock size={14} className="flex-shrink-0" />
            <span>This discussion has been locked by community moderation. New replies are disabled.</span>
          </div>
        )}

        {post.status === 'HIDDEN' && (
          <div
            className="px-6 py-2.5 border-b font-mono text-xs flex items-center gap-2"
            style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#FCA5A5' }}
          >
            <EyeOff size={14} className="flex-shrink-0" />
            <span>This discussion is currently hidden by community moderation.</span>
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* Header metadata */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded text-[11px] font-mono uppercase font-semibold border"
                style={{ background: catStyle.bg, color: catStyle.text, borderColor: catStyle.border }}
              >
                {post.category}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: C.textSub }}>
                <Building2 size={13} />
                <span>{post.organizationName}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono" style={{ color: C.textDim }}>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              {post.editedAt && (
                <span className="text-[10px] text-zinc-500 italic">(edited)</span>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold font-mono tracking-tight text-white">
            {post.title}
          </h1>

          {/* Author safe badge */}
          <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: C.border }}>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold"
              style={{ background: `${C.cyan}20`, color: C.cyan }}
            >
              #
            </div>
            <div className="font-mono text-xs flex items-center gap-2">
              <span className="font-semibold text-cyan-300">{post.authorAlias}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 border border-white/10" style={{ color: C.textDim }}>
                Community Member
              </span>
            </div>
          </div>

          {/* Content */}
          <div
            className="pt-3 font-mono text-xs leading-relaxed whitespace-pre-wrap"
            style={{ color: C.text }}
          >
            {post.content}
          </div>
        </div>
      </div>

      {/* Discussion Replies Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-sm font-semibold text-white">
            <MessageSquare size={16} className="text-cyan-400" />
            <span>Replies ({replies.length})</span>
          </div>
          <span className="font-mono text-[11px]" style={{ color: C.textDim }}>
            Decentralized community responses
          </span>
        </div>

        {/* Replies List */}
        {replies.length === 0 ? (
          <div
            className="p-8 border rounded-lg text-center font-mono text-xs"
            style={{ background: C.surface, borderColor: C.border, color: C.textSub }}
          >
            No replies yet. Be the first to join the conversation!
          </div>
        ) : (
          <div className="space-y-3">
            {replies.map((reply) => (
              <div
                key={reply.id}
                className="border rounded-lg p-4 space-y-2 transition-colors"
                style={{ background: C.surface, borderColor: C.border }}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-cyan-300">{reply.authorAlias}</span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(reply.createdAt).toLocaleString()}
                    </span>
                    {reply.editedAt && (
                      <span className="text-[10px] text-zinc-500 italic">(edited)</span>
                    )}
                  </div>

                  {reply.canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingReplyId(reply.id);
                          setEditContent(reply.content);
                        }}
                        className="text-zinc-400 hover:text-cyan-300 transition-colors"
                        title="Edit reply"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteReply(reply.id)}
                        className="text-zinc-400 hover:text-red-400 transition-colors"
                        title="Delete reply"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {editingReplyId === reply.id ? (
                  <div className="space-y-2 pt-2">
                    <textarea
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2 border rounded font-mono text-xs focus:outline-none"
                      style={{ background: C.surface2, borderColor: C.border2, color: C.text }}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingReplyId(null)}
                        className="px-2.5 py-1 text-xs font-mono border rounded hover:bg-white/5"
                        style={{ borderColor: C.border, color: C.textSub }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEditReply(reply.id)}
                        className="px-3 py-1 text-xs font-mono rounded font-semibold flex items-center gap-1"
                        style={{ background: C.cyan, color: C.bg }}
                      >
                        <Check size={12} /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap" style={{ color: C.text }}>
                    {reply.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reply Composer */}
        {post.locked ? (
          <div
            className="p-4 border rounded-lg font-mono text-xs text-center"
            style={{ background: C.surface2, borderColor: C.border, color: C.textSub }}
          >
            🔒 This discussion is locked. New replies are not accepted.
          </div>
        ) : authenticated ? (
          <form
            onSubmit={handlePostReply}
            className="border rounded-lg p-4 space-y-3"
            style={{ background: C.surface, borderColor: C.border2 }}
          >
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-semibold text-white">Post a Reply</span>
              <span className="text-[10px]" style={{ color: C.textDim }}>
                Posting as safe Member #Alias
              </span>
            </div>

            {replyError && (
              <div
                className="p-2.5 border rounded text-xs font-mono flex items-start gap-2"
                style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: C.red, color: '#FCA5A5' }}
              >
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{replyError}</span>
              </div>
            )}

            <textarea
              required
              rows={4}
              maxLength={2000}
              placeholder="Contribute constructively to this discussion..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="w-full p-3 border rounded font-mono text-xs focus:outline-none transition-colors resize-y"
              style={{ background: C.surface2, borderColor: C.border, color: C.text }}
            />

            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-[10px]" style={{ color: C.textDim }}>
                Anti-spam limit: maximum 20 replies/hour.
              </span>
              <button
                type="submit"
                disabled={submittingReply || !replyContent.trim()}
                className="px-4 py-2 rounded font-mono text-xs uppercase tracking-wider font-semibold transition-opacity disabled:opacity-40 hover:opacity-90 flex items-center gap-2"
                style={{ background: C.cyan, color: C.bg }}
              >
                <Send size={13} />
                <span>{submittingReply ? 'Posting...' : 'Reply'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div
            className="p-6 border rounded-lg text-center space-y-2 font-mono text-xs"
            style={{ background: C.surface, borderColor: C.border }}
          >
            <p className="text-white font-semibold">Join the discussion</p>
            <p style={{ color: C.textSub }}>Sign in with your campus account to post replies and vote.</p>
          </div>
        )}
      </div>
    </div>
  );
}
