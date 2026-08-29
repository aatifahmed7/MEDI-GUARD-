import React, { useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Smartphone, UserRound, ChevronDown } from 'lucide-react';
import type { ConfirmationResult, User } from 'firebase/auth';
import { AuthSession } from '../types.js';
import { friendlyAuthError } from '../auth/authService.js';

interface AuthViewProps {
  onAuthenticated: (session: AuthSession) => void;
  onEmailLogin: (email: string, password: string) => Promise<User>;
  onCreateAccount: (name: string, email: string, password: string) => Promise<User>;
  onGoogleLogin: () => Promise<User>;
  onPhoneLogin: (phone: string, containerId: string) => Promise<ConfirmationResult>;
  onResetPassword: (email: string) => Promise<void>;
  firebaseConfigured: boolean;
  authError?: string;
  onDemoLogin: () => Promise<AuthSession>;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated, onEmailLogin, onCreateAccount, onGoogleLogin, onPhoneLogin, onResetPassword, firebaseConfigured, authError, onDemoLogin }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [providerMessage, setProviderMessage] = useState('');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [otp, setOtp] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const normalizedPhone = () => {
    const digits = phone.replace(/\D/g, '');
    const countryDigits = countryCode.replace(/\D/g, '');
    const nationalDigits = digits.startsWith(countryDigits) && digits.length > countryDigits.length
      ? digits.slice(countryDigits.length)
      : digits;
    if (nationalDigits.length < 6 || nationalDigits.length > 15) throw new Error('Enter a valid phone number.');
    return `+${countryDigits}${nationalDigits}`;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (authMethod === 'phone') {
        if (confirmation) {
          if (!/^\d{6}$/.test(otp.trim())) throw new Error('Enter the 6-digit verification code.');
          await confirmation.confirm(otp);
          return;
        }
        setConfirmation(await onPhoneLogin(normalizedPhone(), 'recaptcha-container'));
        setOtpSent(true);
        setResendSeconds(45);
        return;
      }
      if (mode === 'signup' && password !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }
      const session = mode === 'login'
        ? await onEmailLogin(email, password)
        : await onCreateAccount(name, email, password);
      void session;
    } catch (err) {
      if (authMethod === 'phone') console.error('[MediGuard auth] Phone flow error:', { code: (err as any)?.code, message: (err as any)?.message });
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const startGoogle = async () => {
    if (!firebaseConfigured) {
      setProviderMessage('Google sign-in is temporarily unavailable.');
      return;
    }
    setBusy(true);
    setError('');
    try { await onGoogleLogin(); }
    catch (err) { setError(friendlyAuthError(err)); }
    finally { setBusy(false); }
  };

  const sendReset = async () => {
    if (!email) { setError('Enter your email address first.'); return; }
    setBusy(true);
    try { await onResetPassword(email); setProviderMessage('Password reset instructions have been sent to your email.'); }
    catch (err) { setError(friendlyAuthError(err)); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#102033] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-6xl min-h-[680px] bg-white rounded-[28px] shadow-2xl shadow-[#071E33]/10 overflow-hidden grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="bg-[#071E33] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-24 -bottom-24 w-72 h-72 rounded-full border-[36px] border-[#14B8A6]/20" />
            <div className="relative auth-stagger auth-stagger-1">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#14B8A6] text-[#071E33] grid place-items-center text-xl font-black">M</div>
              <div>
                <p className="font-black text-lg shine-text">MediGuard AI</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Smart adherence platform</p>
              </div>
            </div>
            <div className="mt-20 max-w-md auth-stagger auth-stagger-2">
              <p className="text-[#5EEAD4] text-sm font-semibold tracking-wide">INTELLIGENT MEDICATION ADHERENCE</p>
              <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">Your medication.<br />Your schedule.<br /><span className="text-[#5EEAD4]">Smarter adherence.</span></h1>
              <p className="mt-6 text-slate-300 leading-relaxed auth-stagger auth-stagger-3">Verify every dose, understand your routine, and keep the people who care informed.</p>
            </div>
          </div>
          <div className="relative grid sm:grid-cols-3 gap-4 mt-12 auth-stagger auth-stagger-4">
            {['Remind clearly', 'Verify safely', 'Act earlier'].map((item) => <div key={item} className="border-t border-slate-700 pt-3 text-xs font-semibold text-slate-300">{item}</div>)}
          </div>
        </section>

        <section className="p-7 sm:p-12 lg:p-16 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0F766E]">Welcome to MediGuard</p>
              <h2 className="text-3xl font-black mt-2">{mode === 'login' ? 'Sign in to your care plan' : 'Create your account'}</h2>
              <p className="text-sm text-[#64748B] mt-2">{mode === 'login' ? 'Continue with your secure medication workspace.' : 'Set up your personal adherence workspace in minutes.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button type="button" disabled={busy} onClick={startGoogle} className="h-11 rounded-xl border border-slate-200 font-bold text-sm hover:bg-slate-50 disabled:opacity-60 transition-colors">{busy ? 'Connecting...' : 'G  Continue with Google'}</button>
              <button type="button" onClick={() => { setAuthMethod('phone'); setProviderMessage(''); setError(''); setConfirmation(null); setOtpSent(false); setOtp(''); }} className={`h-11 rounded-xl border font-bold text-sm transition-colors flex items-center justify-center gap-2 ${authMethod === 'phone' ? 'border-[#0F766E] bg-[#E6FFFA] text-[#0F766E]' : 'border-slate-200 hover:bg-slate-50'}`}><Smartphone className="w-4 h-4" /> Phone</button>
            </div>
            {(providerMessage || authError) && <p className="mb-4 rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">{providerMessage || authError}</p>}
            <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-5"><span className="h-px bg-slate-200 flex-1" /> {authMethod === 'phone' ? 'PHONE VERIFICATION' : 'OR CONTINUE WITH EMAIL'} <span className="h-px bg-slate-200 flex-1" /></div>

            <form onSubmit={submit} className="space-y-4">
              {authMethod === 'phone' ? <label className="block"><span className="field-label">Phone number</span><div className="input-wrap"><div className="flex items-center gap-1 border-r border-slate-200 pr-2"><select aria-label="Country code" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="bg-transparent outline-none text-sm font-semibold"><option value="+91">+91</option><option value="+1">+1</option><option value="+44">+44</option></select><ChevronDown className="w-3 h-3" /></div><Smartphone /><input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" /></div></label> : <><label className="block">{mode === 'signup' && <><span className="field-label">Full name</span><div className="input-wrap"><UserRound /><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div></>}</label><label className="block"><span className="field-label">Email address</span><div className="input-wrap"><Mail /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div></label><label className="block"><span className="field-label">Password</span><div className="input-wrap"><LockKeyhole /><input required minLength={8} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff /> : <Eye />}</button></div></label></>}
              {authMethod === 'email' && mode === 'signup' && <label className="block"><span className="field-label">Confirm password</span><div className="input-wrap"><LockKeyhole /><input required minLength={8} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat your password" /></div></label>}
              {otpSent && <><label className="block"><span className="field-label">Verification code</span><div className="input-wrap"><LockKeyhole /><input required inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="Enter the OTP sent to your phone" /></div></label><button type="button" disabled={busy || resendSeconds > 0} onClick={() => { setConfirmation(null); setOtpSent(false); setError(''); }} className="text-xs font-bold text-[#2563EB] hover:underline disabled:opacity-50">{resendSeconds > 0 ? `Resend Code in ${resendSeconds}s` : 'Resend Code'}</button></>}
              {error && <p className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700">{error}</p>}
              <button disabled={busy} className="w-full h-12 rounded-xl bg-[#0F766E] text-white font-bold text-sm hover:bg-[#0b615b] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">{busy ? (authMethod === 'phone' && !otpSent ? 'Sending OTP...' : 'Signing in...') : authMethod === 'phone' ? (otpSent ? 'Verify & continue' : 'Send verification code') : mode === 'login' ? 'Sign in securely' : 'Set up my MediGuard'} {!busy && <ArrowRight className="w-4 h-4" />}</button>
            </form>

            {authMethod === 'phone' && <div id="recaptcha-container" />}
            {authMethod === 'email' && mode === 'login' && <button type="button" onClick={sendReset} className="mt-3 text-xs font-bold text-[#2563EB] hover:underline">Forgot password?</button>}

            <div className="mt-7 text-center text-sm text-[#64748B]">{mode === 'login' ? 'New to MediGuard?' : 'Already have an account?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }} className="font-bold text-[#2563EB] hover:underline">{mode === 'login' ? 'Create account' : 'Sign in'}</button></div>
            <p className="mt-8 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Medication adherence support, not medical advice.</p>
          </div>
        </section>
      </div>
    </main>
  );
};
