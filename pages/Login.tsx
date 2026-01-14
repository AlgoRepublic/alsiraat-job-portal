
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { db } from '../services/database';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSSOLoading, setIsSSOLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
        await db.login(email, password);
        setTimeout(() => {
            window.location.reload();
        }, 100);
    } catch (err: any) {
        setError(err.message || 'Login failed. Please check your credentials.');
        setIsLoading(false);
    }
  };

  const handleEntraLogin = async () => {
      setIsSSOLoading(true);
      try {
          await db.loginWithEntra(); 
          setTimeout(() => {
            window.location.reload();
          }, 100);
      } catch (error) {
          console.error("SSO Failed", error);
          setIsSSOLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors relative overflow-hidden bg-zinc-50 dark:bg-black">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md glass-card rounded-3xl shadow-2xl shadow-zinc-200 dark:shadow-black/50 p-8 md:p-10 border border-white/20 dark:border-zinc-700 animate-slide-up relative">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-red-900 to-red-600 dark:from-red-800 dark:to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-900/20 relative">
            <CheckCircle2 className="text-white w-9 h-9" strokeWidth={2.5} />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] text-white font-bold">T</div>
          </div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 tracking-tighter">Tasker Portal</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-bold uppercase tracking-widest text-[10px]">Enterprise Task Orchestration</p>
        </div>

        <div className="mb-8">
            <button 
                onClick={handleEntraLogin}
                disabled={isSSOLoading}
                className="w-full flex items-center justify-center relative px-4 py-3.5 bg-[#2F2F2F] hover:bg-[#1a1a1a] dark:bg-[#0078D4] dark:hover:bg-[#006cbd] text-white border border-transparent rounded-xl transition-all shadow-md group disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isSSOLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        <div className="absolute left-4 flex items-center">
                             <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 0H10.555V10.555H0V0Z" fill="#F25022"/><path d="M12.444 0H23V10.555H12.444V0Z" fill="#7FBA00"/><path d="M0 12.444H10.555V23H0V12.444Z" fill="#00A4EF"/><path d="M12.444 12.444H23V23H12.444V12.444Z" fill="#FFB900"/></svg>
                        </div>
                        <span className="font-bold tracking-tight">Sign in with Microsoft Entra</span>
                    </>
                )}
            </button>
            <div className="mt-3 flex justify-center">
                 <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-2">
                     <Shield className="w-3 h-3 text-emerald-500" /> SAML / SSO Protected
                 </span>
            </div>
        </div>

        <div className="flex items-center mb-8">
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
          <span className="px-4 text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Deployment Access</span>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
        </div>

        {error && (
            <div className="mb-6 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2 animate-shake">
                <AlertCircle className="w-5 h-5 text-red-800 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-300 font-medium">{error}</p>
            </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-4 w-5 h-5 text-zinc-400 group-focus-within:text-red-600 transition-colors" />
              <input 
                type="email" 
                required
                placeholder="Work Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-4 focus:ring-red-500/20 outline-none text-sm font-bold dark:text-white transition-all backdrop-blur-md"
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-4 w-5 h-5 text-zinc-400 group-focus-within:text-red-600 transition-colors" />
              <input 
                type="password" 
                required
                placeholder="System Key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-4 focus:ring-red-500/20 outline-none text-sm font-bold dark:text-white transition-all backdrop-blur-md"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between text-[10px]">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded-md border-zinc-300 text-red-900 focus:ring-red-900" />
              <span className="text-zinc-500 font-bold uppercase tracking-widest">Maintain Session</span>
            </label>
            <a href="#" className="font-black text-red-900 dark:text-red-400 hover:underline uppercase tracking-widest">Access Support?</a>
          </div>

          <button 
            disabled={isLoading}
            className="w-full py-4 bg-red-900 dark:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-800 dark:hover:bg-red-600 shadow-xl shadow-red-900/30 transition-all hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Initialize Session'}
          </button>
        </form>

        <div className="mt-8 text-center">
            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-[0.3em]">
                Secure Enterprise Environment
            </p>
        </div>
      </div>
    </div>
  );
};
