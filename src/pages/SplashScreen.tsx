import React from 'react';

export const SplashScreen: React.FC = () => (
  <main className="min-h-screen bg-[#071E33] text-white grid place-items-center p-6 relative overflow-hidden">
    <div className="text-center auth-splash-content">
      <div className="mx-auto w-20 h-20 rounded-[26px] bg-[#14B8A6] text-[#071E33] grid place-items-center text-4xl font-black shadow-2xl shadow-[#14B8A6]/30 auth-splash-logo">M</div>
      <h1 className="mt-7 text-3xl font-black tracking-tight shine-text">MediGuard AI</h1>
      <p className="mt-2 text-sm text-slate-300">Smart Medication Adherence</p>
      <div className="mt-8 flex justify-center gap-2" aria-label="Loading">
        <span className="splash-dot" /><span className="splash-dot splash-dot-delay-1" /><span className="splash-dot splash-dot-delay-2" />
      </div>
    </div>
    <p className="absolute bottom-8 text-[11px] uppercase tracking-[0.2em] text-slate-400">Secured by MediGuard</p>
  </main>
);
