import React, { useState } from 'react';
import {
  Building2,
  Mail,
  User,
  MapPin,
  Globe,
  FileText,
  Key,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import {
  submitOrganizationApplication,
  CreateOrganizationApplicationRequest,
  OrganizationType,
  ApiError,
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
  rose: '#F43F5E',
} as const;

const ORG_TYPES: { value: OrganizationType; label: string }[] = [
  { value: 'UNIVERSITY', label: 'University' },
  { value: 'COLLEGE', label: 'College' },
  { value: 'SCHOOL', label: 'School / Academy' },
  { value: 'NGO', label: 'NGO / Non-Profit' },
  { value: 'CORPORATE', label: 'Corporate Entity' },
  { value: 'OTHER', label: 'Other Organization' },
];

export function OrganizationApplicationApply({
  onBackToLogin,
}: {
  onBackToLogin?: () => void;
}) {
  const [formData, setFormData] = useState<CreateOrganizationApplicationRequest>({
    organizationName: '',
    organizationType: 'UNIVERSITY',
    officialEmail: '',
    contactPerson: '',
    address: '',
    website: '',
    description: '',
    requestedAdminUsername: '',
    requestedAdminEmail: '',
    requestedAdminPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const validate = (): string | null => {
    if (!formData.organizationName.trim()) return 'Organization name is required.';
    if (formData.organizationName.length > 200) return 'Organization name exceeds 200 characters.';
    if (!formData.officialEmail.trim() || !formData.officialEmail.includes('@'))
      return 'Valid official email is required.';
    if (!formData.contactPerson.trim()) return 'Contact person is required.';
    if (!formData.address.trim()) return 'Address is required.';
    if (!formData.description.trim()) return 'Description is required.';
    if (formData.description.length > 2000) return 'Description exceeds 2000 characters.';
    if (
      !formData.requestedAdminUsername.trim() ||
      formData.requestedAdminUsername.length < 3 ||
      formData.requestedAdminUsername.length > 100
    ) {
      return 'Admin username must be between 3 and 100 characters.';
    }
    if (!formData.requestedAdminEmail.trim() || !formData.requestedAdminEmail.includes('@'))
      return 'Valid administrator email is required.';
    if (formData.requestedAdminPassword.length < 6)
      return 'Administrator password must be at least 6 characters.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await submitOrganizationApplication({
        ...formData,
        organizationName: formData.organizationName.trim(),
        officialEmail: formData.officialEmail.trim(),
        contactPerson: formData.contactPerson.trim(),
        address: formData.address.trim(),
        website: formData.website?.trim() || undefined,
        description: formData.description.trim(),
        requestedAdminUsername: formData.requestedAdminUsername.trim(),
        requestedAdminEmail: formData.requestedAdminEmail.trim(),
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('An organization or admin username with these credentials already exists.');
        } else if (err.status === 429) {
          setError('Too many requests. Please wait a few moments before trying again.');
        } else {
          setError(err.message || 'Failed to submit application. Please check input values.');
        }
      } else {
        setError('Could not connect to the server. Please check your internet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen py-12 px-4 flex items-center justify-center"
      style={{ background: C.bg }}
    >
      <div
        className="w-full max-w-2xl border p-8 shadow-2xl"
        style={{ background: C.surface, borderColor: C.border2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 flex items-center justify-center font-mono font-bold text-sm"
              style={{ background: C.cyan, color: C.bg }}
            >
              E
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.2em]" style={{ color: C.textSub }}>
                ETHOS GOVERNANCE
              </div>
              <h1 className="font-serif text-2xl" style={{ color: C.text }}>
                Institutional Onboarding
              </h1>
            </div>
          </div>
          {onBackToLogin && (
            <button
              onClick={onBackToLogin}
              className="flex items-center gap-1.5 font-mono text-xs hover:underline"
              style={{ color: C.textSub }}
            >
              <ArrowLeft size={13} /> Return to Sign In
            </button>
          )}
        </div>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: `${C.emerald}14`, color: C.emerald }}>
              <CheckCircle2 size={36} />
            </div>
            <h2 className="font-serif text-2xl" style={{ color: C.text }}>
              Application Submitted Successfully
            </h2>
            <p className="font-mono text-xs max-w-md mx-auto leading-relaxed" style={{ color: C.textSub }}>
              Your institution's application for <strong style={{ color: C.cyan }}>{formData.organizationName}</strong> has been securely logged and is awaiting verification by the ETHOS Platform Super Admin.
            </p>
            <div className="p-4 border text-left font-mono text-xs space-y-2 mx-auto max-w-md" style={{ borderColor: C.border, background: C.surface2 }}>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: C.textDim }}>Next Steps:</div>
              <div style={{ color: C.textSub }}>• Super Admin verifies institutional credentials and legitimacy.</div>
              <div style={{ color: C.textSub }}>• Upon approval, requested administrator account <span style={{ color: C.text }}>({formData.requestedAdminUsername})</span> is provisioned.</div>
              <div style={{ color: C.textSub }}>• You will receive verification confirmation at <span style={{ color: C.text }}>{formData.requestedAdminEmail}</span>.</div>
            </div>
            {onBackToLogin && (
              <button
                onClick={onBackToLogin}
                className="mt-6 px-6 py-2.5 font-mono text-xs uppercase tracking-widest"
                style={{ background: C.cyan, color: C.bg }}
              >
                Back to Sign In
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <p className="font-mono text-xs leading-relaxed" style={{ color: C.textSub }}>
              Register your university, college, or organization on the ETHOS ethical governance platform. All applications undergo verification before activation.
            </p>

            {error && (
              <div
                className="flex items-start gap-2.5 p-3.5 border text-xs font-mono"
                style={{
                  borderColor: `${C.rose}40`,
                  background: `${C.rose}0A`,
                  color: C.rose,
                }}
              >
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Institution Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest pb-1 border-b" style={{ borderColor: C.border, color: C.cyan }}>
                <Building2 size={13} />
                Institution Details
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textSub }}>
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleChange}
                    placeholder="e.g. Stanford University"
                    maxLength={200}
                    required
                    className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none transition-colors"
                    style={{ borderColor: C.border, color: C.text }}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textSub }}>
                    Organization Type *
                  </label>
                  <select
                    name="organizationType"
                    value={formData.organizationType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none transition-colors"
                    style={{ borderColor: C.border, color: C.text, background: C.surface }}
                    disabled={loading}
                  >
                    {ORG_TYPES.map((t) => (
                      <option key={t.value} value={t.value} style={{ background: C.surface, color: C.text }}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textSub }}>
                    Official Email *
                  </label>
                  <input
                    type="email"
                    name="officialEmail"
                    value={formData.officialEmail}
                    onChange={handleChange}
                    placeholder="administration@university.edu"
                    maxLength={255}
                    required
                    className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none"
                    style={{ borderColor: C.border, color: C.text }}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textSub }}>
                    Contact Person / Dean / Officer *
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="Dr. Jane Doe, Vice Provost"
                    maxLength={100}
                    required
                    className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none"
                    style={{ borderColor: C.border, color: C.text }}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textSub }}>
                  Physical Campus / Official Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="450 Serra Mall, Stanford, CA 94305"
                  maxLength={500}
                  required
                  className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none"
                  style={{ borderColor: C.border, color: C.text }}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textSub }}>
                  Official Website (Optional)
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website || ''}
                  onChange={handleChange}
                  placeholder="https://www.stanford.edu"
                  maxLength={255}
                  className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none"
                  style={{ borderColor: C.border, color: C.text }}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textSub }}>
                  Organization Description & Transparency Mission *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Briefly describe your institution and objectives for ethical complaint resolution and transparency."
                  rows={3}
                  maxLength={2000}
                  required
                  className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none resize-none leading-relaxed"
                  style={{ borderColor: C.border, color: C.text }}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Section 2: Requested Institutional Administrator */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest pb-1 border-b" style={{ borderColor: C.border, color: C.cyan }}>
                <Shield size={13} />
                Requested Institutional Administrator Account
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textSub }}>
                    Administrator Username *
                  </label>
                  <input
                    type="text"
                    name="requestedAdminUsername"
                    value={formData.requestedAdminUsername}
                    onChange={handleChange}
                    placeholder="admin_stanford"
                    minLength={3}
                    maxLength={100}
                    required
                    className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none"
                    style={{ borderColor: C.border, color: C.text }}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textSub }}>
                    Administrator Direct Email *
                  </label>
                  <input
                    type="email"
                    name="requestedAdminEmail"
                    value={formData.requestedAdminEmail}
                    onChange={handleChange}
                    placeholder="provost.office@stanford.edu"
                    maxLength={255}
                    required
                    className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none"
                    style={{ borderColor: C.border, color: C.text }}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textSub }}>
                  Administrator Password *
                </label>
                <input
                  type="password"
                  name="requestedAdminPassword"
                  value={formData.requestedAdminPassword}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  maxLength={100}
                  required
                  className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none"
                  style={{ borderColor: C.border, color: C.text }}
                  disabled={loading}
                />
                <span className="font-mono text-[10px]" style={{ color: C.textDim }}>
                  Will be encrypted using BCrypt upon Super Admin approval.
                </span>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 font-mono text-xs uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                style={{ background: C.cyan, color: C.bg }}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Submitting Application…
                  </>
                ) : (
                  'Submit Institutional Application'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
