import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Paperclip,
  Eye,
  Trash2,
  Upload,
  Image as ImageIcon,
  Shield,
  Loader2,
  X,
  AlertTriangle,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getIssueAttachments,
  uploadIssueAttachment,
  deleteIssueAttachment,
  type IssueAttachment,
} from '../api';

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
  emerald: '#10B981',
  amber: '#F59E0B',
  violet: '#8B5CF6',
  rose: '#F43F5E',
} as const;

interface EvidenceWorkspaceProps {
  caseId: string | number;
  isAdmin: boolean;
  onEvidenceAdded?: (att: IssueAttachment) => void;
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function EvidenceWorkspace({ caseId, isAdmin, onEvidenceAdded }: EvidenceWorkspaceProps) {
  const [attachments, setAttachments] = useState<IssueAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<IssueAttachment | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = async () => {
    if (!caseId) return;
    try {
      setLoading(true);
      const data = await getIssueAttachments(caseId);
      setAttachments(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load case attachments';
      console.warn('Could not load attachments:', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [caseId]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      toast.error('Unsupported format. Allowed: JPEG, PNG, WebP');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      toast.error('File size exceeds the 10 MB limit');
      return;
    }

    try {
      setUploading(true);
      const newAtt = await uploadIssueAttachment(caseId, file);
      setAttachments(prev => [newAtt, ...prev]);
      toast.success(`Image attached: ${newAtt.originalFilename}`);
      if (onEvidenceAdded) {
        onEvidenceAdded(newAtt);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Image upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (att: IssueAttachment) => {
    if (!isAdmin) return;
    if (!confirm(`Delete image attachment "${att.originalFilename}"?`)) return;

    try {
      setDeletingId(att.id);
      await deleteIssueAttachment(caseId, att.id);
      setAttachments(prev => prev.filter(a => a.id !== att.id));
      if (previewAttachment?.id === att.id) {
        setPreviewAttachment(null);
      }
      toast.success('Image attachment deleted');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete attachment';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!isAdmin) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      {isAdmin && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest flex items-center gap-2" style={{ color: C.textDim }}>
          <ImageIcon size={12} style={{ color: C.cyan }} />
          Case Attachments ({attachments.length})
        </div>
        {isAdmin && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 border font-mono text-[10px] uppercase tracking-widest transition-opacity hover:opacity-70 disabled:opacity-50"
            style={{ borderColor: C.border2, color: C.cyan, background: `${C.cyan}08` }}
          >
            {uploading ? (
              <>
                <Loader2 size={11} className="animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload size={11} /> Attach Image
              </>
            )}
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12 border gap-2 font-mono text-xs" style={{ borderColor: C.border, color: C.textDim }}>
          <Loader2 size={16} className="animate-spin" style={{ color: C.cyan }} />
          Loading secure attachments...
        </div>
      ) : attachments.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-12 border gap-2.5" style={{ borderColor: C.border, background: C.surface }}>
          <Paperclip size={26} style={{ color: C.border2 }} />
          <p className="font-mono text-xs uppercase tracking-widest" style={{ color: C.textDim }}>
            No image attachments
          </p>
          <p className="font-mono text-[10px]" style={{ color: C.textDim }}>
            {isAdmin ? 'Upload photographic evidence or supporting images' : 'No images attached to this case'}
          </p>
        </div>
      ) : (
        /* Grid of attachments */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attachments.map(att => (
            <div
              key={att.id}
              className="border flex flex-col justify-between overflow-hidden transition-all hover:border-[#2D3140]"
              style={{ borderColor: C.border, background: C.surface }}
            >
              {/* Image Thumbnail */}
              <div
                className="relative aspect-video bg-black/40 overflow-hidden cursor-pointer group flex items-center justify-center"
                onClick={() => setPreviewAttachment(att)}
              >
                <img
                  src={att.secureUrl}
                  alt={att.originalFilename}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 bg-black/80 border border-white/20 text-white flex items-center gap-1">
                    <Eye size={10} /> Preview
                  </span>
                </div>
                {att.format && (
                  <span
                    className="absolute top-2 left-2 font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 border"
                    style={{ background: '#0B0F14E0', borderColor: C.border, color: C.cyan }}
                  >
                    {att.format}
                  </span>
                )}
              </div>

              {/* Metadata */}
              <div className="p-3 border-t flex flex-col gap-1.5" style={{ borderColor: C.border, background: C.surface2 }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs truncate font-medium" style={{ color: C.text }} title={att.originalFilename}>
                    {att.originalFilename}
                  </span>
                  <span className="font-mono text-[9px] flex-shrink-0" style={{ color: C.textDim }}>
                    {formatBytes(att.bytes)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[9px] font-mono" style={{ color: C.textDim }}>
                  <span>
                    By {att.uploadedByUsername ?? 'Admin'} · {formatDistanceToNow(new Date(att.createdAt), { addSuffix: true })}
                  </span>
                  {att.width && att.height && (
                    <span style={{ color: C.textDim }}>
                      {att.width}×{att.height}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-1 border-t mt-1" style={{ borderColor: `${C.border}80` }}>
                  <button
                    onClick={() => setPreviewAttachment(att)}
                    className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest transition-opacity hover:opacity-70"
                    style={{ color: C.cyan }}
                  >
                    <Eye size={10} /> View Full
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(att)}
                      disabled={deletingId === att.id}
                      className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest transition-opacity hover:opacity-70 disabled:opacity-40"
                      style={{ color: C.rose }}
                    >
                      {deletingId === att.id ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <Trash2 size={10} />
                      )}
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Drag and Drop Upload Area */}
      {isAdmin && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed flex flex-col items-center justify-center py-8 gap-2 transition-all cursor-pointer hover:border-cyan-500/50"
          style={{
            borderColor: dragActive ? C.cyan : C.border2,
            background: dragActive ? `${C.cyan}08` : 'transparent',
          }}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={20} className="animate-spin" style={{ color: C.cyan }} />
              <div className="font-mono text-xs uppercase tracking-widest" style={{ color: C.cyan }}>
                Uploading to secure storage...
              </div>
            </div>
          ) : (
            <>
              <Upload size={20} style={{ color: dragActive ? C.cyan : C.textDim }} />
              <div className="font-mono text-xs uppercase tracking-widest" style={{ color: dragActive ? C.cyan : C.textSub }}>
                Drop image here or click to browse
              </div>
              <div className="font-mono text-[9px]" style={{ color: C.textDim }}>
                Supported: JPEG, PNG, WebP · Maximum size: 10 MB
              </div>
            </>
          )}
        </div>
      )}

      {/* Security notice */}
      <div className="flex items-start gap-2 p-3 border" style={{ borderColor: C.border, background: `${C.violet}06` }}>
        <Shield size={12} className="flex-shrink-0 mt-0.5" style={{ color: C.violet }} />
        <p className="font-mono text-[10px] leading-relaxed" style={{ color: C.textDim }}>
          Image attachments are securely isolated per organization and audited. Direct Cloudinary credentials are strictly confined to the backend server.
        </p>
      </div>

      {/* Preview Modal / Lightbox */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="max-w-3xl w-full border flex flex-col overflow-hidden"
            style={{ borderColor: C.border2, background: C.bg }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: C.border, background: C.surface }}>
              <div className="flex items-center gap-2 overflow-hidden">
                <ImageIcon size={14} style={{ color: C.cyan }} />
                <span className="font-mono text-xs truncate" style={{ color: C.text }}>
                  {previewAttachment.originalFilename}
                </span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 border" style={{ borderColor: C.border, color: C.textDim }}>
                  {formatBytes(previewAttachment.bytes)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={previewAttachment.secureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] uppercase tracking-widest flex items-center gap-1 hover:underline"
                  style={{ color: C.cyan }}
                >
                  <ExternalLink size={11} /> Open Original
                </a>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1 hover:opacity-70 transition-opacity"
                  style={{ color: C.textSub }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 bg-black/60 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={previewAttachment.secureUrl}
                alt={previewAttachment.originalFilename}
                className="max-h-[65vh] max-w-full object-contain rounded"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-3 border-t font-mono text-[10px]" style={{ borderColor: C.border, background: C.surface2, color: C.textDim }}>
              <span>Uploaded by {previewAttachment.uploadedByUsername ?? 'Admin'}</span>
              {previewAttachment.width && previewAttachment.height && (
                <span>Dimensions: {previewAttachment.width} × {previewAttachment.height} px</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
