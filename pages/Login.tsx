import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Loader2, Shield, AlertCircle, Layers } from "lucide-react";
import { db } from "../services/database";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSSOLoading, setIsSSOLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await db.login(email, password);
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
      setIsLoading(false);
    }
  };

  const handleEntraLogin = () => {
    window.location.href = "http://localhost:5001/api/auth/saml";
  };

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5001/api/auth/google";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors relative overflow-hidden bg-zinc-50 dark:bg-black">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#812349]/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md glass-card rounded-3xl shadow-2xl shadow-zinc-200 dark:shadow-black/50 p-8 md:p-10 border border-white/20 dark:border-zinc-700 animate-slide-up relative">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-[#812349] to-[#a02b5a] dark:from-[#601a36] dark:to-[#812349] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#812349]/20 relative">
            <Layers className="text-white w-9 h-9" strokeWidth={2.5} />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] text-white font-bold">
              T
            </div>
          </div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 tracking-tighter">
            Tasker
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-bold uppercase tracking-widest text-[10px]">
            School Task Portal
          </p>
        </div>

        <div className="mb-8 space-y-3">
          <button
            onClick={handleEntraLogin}
            className="w-full flex items-center justify-center relative px-4 py-3.5 bg-[#2F2F2F] hover:bg-[#1a1a1a] dark:bg-[#0078D4] dark:hover:bg-[#006cbd] text-white border border-transparent rounded-xl transition-all shadow-md group"
          >
            <div className="absolute left-4 flex items-center">
              <svg
                className="w-5 h-5"
                viewBox="0 0 23 23"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M0 0H10.555V10.555H0V0Z" fill="#F25022" />
                <path d="M12.444 0H23V10.555H12.444V0Z" fill="#7FBA00" />
                <path d="M0 12.444H10.555V23H0V12.444Z" fill="#00A4EF" />
                <path d="M12.444 12.444H23V23H12.444V12.444Z" fill="#FFB900" />
              </svg>
            </div>
            <span className="font-bold tracking-tight">
              Sign in with Microsoft
            </span>
          </button>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center relative px-4 py-3.5 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-xl transition-all shadow-sm group"
          >
            <div className="absolute left-4 flex items-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </div>
            <span className="font-bold tracking-tight">
              Sign in with Google
            </span>
          </button>
          <div className="mt-3 flex justify-center">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-3 h-3 text-emerald-500" /> Secure Login
            </span>
          </div>
        </div>

        <div className="flex items-center mb-8">
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
          <span className="px-4 text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">
            Access your Account
          </span>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2 animate-shake">
            <AlertCircle className="w-5 h-5 text-red-800 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-4 w-5 h-5 text-zinc-400 group-focus-within:text-[#812349] transition-colors" />
              <input
                type="email"
                required
                placeholder="Work Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-4 focus:ring-[#812349]/20 outline-none text-sm font-bold dark:text-white transition-all backdrop-blur-md"
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-4 w-5 h-5 text-zinc-400 group-focus-within:text-[#812349] transition-colors" />
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-4 focus:ring-[#812349]/20 outline-none text-sm font-bold dark:text-white transition-all backdrop-blur-md"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded-md border-zinc-300 text-[#812349] focus:ring-[#812349]"
              />
              <span className="text-zinc-500 font-bold uppercase tracking-widest">
                Remember me
              </span>
            </label>
            <Link
              to="/forgot-password"
              className="font-black text-[#812349] dark:text-[#a02b5a] hover:underline uppercase tracking-widest"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            disabled={isLoading}
            className="w-full py-4 bg-[#812349] dark:bg-[#601a36] text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#601a36] dark:hover:bg-[#4d152b] shadow-xl shadow-[#812349]/30 transition-all hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Login"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            No account?{" "}
            <Link
              to="/signup"
              className="text-[#812349] dark:text-[#a02b5a] font-black hover:underline ml-1"
            >
              Sign up
            </Link>
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-[0.3em]">
            School Task Portal
          </p>
        </div>
      </div>
    </div>
  );
};
