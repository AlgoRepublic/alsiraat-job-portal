import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Loader2,
  Shield,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Send,
} from "lucide-react";
import { db } from "../services/database";

export const ForgotPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await db.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Request failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors relative overflow-hidden bg-zinc-50 dark:bg-black">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md glass-card rounded-3xl shadow-2xl shadow-zinc-200 dark:shadow-black/50 p-8 md:p-10 border border-white/20 dark:border-zinc-700 animate-slide-up relative">
        <Link
          to="/login"
          className="absolute top-6 left-6 text-zinc-400 hover:text-red-600 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="text-center mb-10 mt-4">
          <div className="w-16 h-16 bg-gradient-to-tr from-zinc-900 to-zinc-700 dark:from-zinc-800 dark:to-zinc-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl relative">
            <Shield className="text-white w-9 h-9" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 tracking-tighter">
            Reset Key
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-bold uppercase tracking-widest text-[10px]">
            Recover System Access
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-left">
                <h3 className="text-emerald-900 dark:text-emerald-400 font-bold mb-1">
                  Request Sent
                </h3>
                <p className="text-emerald-800 dark:text-emerald-300 text-sm">
                  If this email is registered, you will receive a reset link
                  shortly.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 font-black uppercase tracking-widest text-[10px] hover:text-red-600 transition-colors"
            >
              Return to Entry Point
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2 animate-shake">
                <AlertCircle className="w-5 h-5 text-red-800 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                  {error}
                </p>
              </div>
            )}

            <form onSubmit={handleForgot} className="space-y-6">
              <div className="relative group">
                <Mail className="absolute left-4 top-4 w-5 h-5 text-zinc-400 group-focus-within:text-red-600 transition-colors" />
                <input
                  type="email"
                  required
                  placeholder="Registered Work Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-4 focus:ring-red-500/20 outline-none text-sm font-bold dark:text-white transition-all backdrop-blur-md"
                />
              </div>

              <button
                disabled={isLoading}
                className="w-full py-4 bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black dark:hover:bg-zinc-700 shadow-xl transition-all hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Dispatch Request
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
