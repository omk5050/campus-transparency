import React, { useState } from 'react';
import {
  Key,
  Building2,
  Shield,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
} from 'lucide-react';
import {
  validateJoinCode,
  registerWithJoinCode,
  ValidateJoinCodeResponse,
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

export function JoinCodeRegistration({
  onSuccess,
  onBackToLogin,
}: {
  onSuccess: () => void;
  onBackToLogin?: () => void;
}) {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidateJoinCodeResponse | null>(null);

  // Registration credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter your institutional join code.');
      return;
    }

    setValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const res = await validateJoinCode(cleanCode);
      if (res.valid) {
        setValidationResult(res);
      } else {
        setError(res.message || 'This join code is invalid, revoked, or has expired.');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError('Invalid join code. Please check with your campus administrator.');
        } else if (err.status === 429) {
          setError('Too many validation attempts. Please wait a moment.');
        } else {
          setError(err.message || 'Verification failed.');
        }
      } else {
        setError('Could not connect to authentication service.');
      }
    } finally {
      setValidating(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validationResult) {
      setError('Please validate your join code first.');
      return;
    }
    const cleanUser = username.trim();
    if (cleanUser.length < 3 || cleanUser.length > 50) {
      setError('Username must be between 3 and 50 characters.');
      return;
    }
    const userPattern = /^[a-zA-Z0-9_.-]+$/;
    if (!userPattern.test(cleanUser)) {
      setError('Username can only contain alphanumeric characters, underscores, dots, or dashes.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setRegistering(true);
    setError(null);

    try {
      await registerWithJoinCode({
        username: cleanUser,
        password,
        joinCode: validationResult.code,
      });
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('Username is already registered. Please choose a different username.');
        } else if (err.status === 400) {
          setError(err.message || 'Registration rejected. Please verify information.');
        } else if (err.status === 429) {
          setError('Too many registration requests. Please wait a moment.');
        } else {
          setError(err.message || 'Registration failed.');
        }
      } else {
        setError('Could not complete registration. Is the server running?');
      }
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div
      className="min-h-screen py-12 px-4 flex items-center justify-center"
      style={{ background: C.bg }}
    >
      <div
        className="w-full max-w-md border p-8 shadow-2xl"
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
                Join Organization
              </h1>
            </div>
          </div>
          {onBackToLogin && (
            <button
              onClick={onBackToLogin}
              className="flex items-center gap-1.5 font-mono text-xs hover:underline"
              style={{ color: C.textSub }}
            >
              <ArrowLeft size={13} /> Sign In
            </button>
          )}
        </div>

        {error && (
          <div
            className="flex items-start gap-2.5 p-3 mb-6 border text-xs font-mono"
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

        {/* Step 1: Join Code Input */}
        <form onSubmit={handleValidate} className="space-y-4 mb-6">
          <label className="block font-mono text-[10px] uppercase tracking-widest" style={{ color: C.textSub }}>
            Step 1: Enter Institutional Join Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setValidationResult(null);
                if (error) setError(null);
              }}
              placeholder="e.g. CAMPUS-7X9K2P"
              maxLength={64}
              disabled={validating || registering}
              className="flex-1 px-3 py-2.5 font-mono text-sm border bg-transparent outline-none uppercase tracking-wider"
              style={{
                borderColor: validationResult ? C.emerald : code ? C.cyan : C.border,
                color: C.text,
              }}
            />
            <button
              type="submit"
              disabled={validating || !code.trim() || registering}
              className="px-4 py-2.5 font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: C.cyan, color: C.bg }}
            >
              {validating ? <Loader2 size={13} className="animate-spin" /> : 'Validate'}
            </button>
          </div>
          <span className="block font-mono text-[10px]" style={{ color: C.textDim }}>
            Obtain a join code from your university or department administrator.
          </span>
        </form>

        {/* Step 2: Validated Institution Preview & Account Creation */}
        {validationResult && (
          <div className="space-y-6 pt-4 border-t" style={{ borderColor: C.border }}>
            {/* Institution Badge */}
            <div
              className="p-4 border font-mono text-xs space-y-1.5"
              style={{
                borderColor: `${C.emerald}40`,
                background: `${C.emerald}0A`,
              }}
            >
              <div className="flex items-center gap-2" style={{ color: C.emerald }}>
                <CheckCircle2 size={14} />
                <span className="font-bold uppercase tracking-wider">Institution Verified</span>
              </div>
              <div className="text-sm font-serif" style={{ color: C.text }}>
                {validationResult.organizationName}
              </div>
              <div className="flex items-center gap-3 text-[10px]" style={{ color: C.textSub }}>
                <span>Type: {validationResult.organizationType}</span>
                <span>•</span>
                <span>
                  Role: <strong style={{ color: C.cyan }}>{validationResult.targetRole}</strong>
                </span>
              </div>
            </div>

            {/* Account Creation Form */}
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="font-mono text-[10px] uppercase tracking-widest pb-1 border-b" style={{ borderColor: C.border, color: C.cyan }}>
                Step 2: Create Account Credentials
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textSub }}>
                  Username *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. john_doe"
                  minLength={3}
                  maxLength={50}
                  required
                  autoComplete="username"
                  disabled={registering}
                  className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none"
                  style={{ borderColor: C.border, color: C.text }}
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textSub }}>
                  Password (min 6 characters) *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  maxLength={100}
                  required
                  autoComplete="new-password"
                  disabled={registering}
                  className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none"
                  style={{ borderColor: C.border, color: C.text }}
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textSub }}>
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  maxLength={100}
                  required
                  autoComplete="new-password"
                  disabled={registering}
                  className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none"
                  style={{ borderColor: C.border, color: C.text }}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={registering}
                  className="w-full py-3 font-mono text-xs uppercase tracking-[0.15em] font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                  style={{ background: C.cyan, color: C.bg }}
                >
                  {registering ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Provisioning Account…
                    </>
                  ) : (
                    <>
                      Complete Registration <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
