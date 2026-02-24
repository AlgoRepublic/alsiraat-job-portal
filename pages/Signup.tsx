import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Lock,
  User as UserIcon,
  Shield,
  AlertCircle,
  Layers,
  ArrowLeft,
  Building2,
  Phone,
} from "lucide-react";
import { db } from "../services/database";
import { UserRole } from "../types";
import { LoadingOverlay } from "../components/Loading";

/** Formats input as an Australian phone number (mobile or landline) */
const formatAustralianPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.startsWith("04")) {
    const p1 = digits.slice(0, 4);
    const p2 = digits.slice(4, 7);
    const p3 = digits.slice(7, 10);
    return [p1, p2, p3].filter(Boolean).join(" ");
  } else if (digits.startsWith("0")) {
    const area = digits.slice(0, 2);
    const p1 = digits.slice(2, 6);
    const p2 = digits.slice(6, 10);
    let result = area ? `(${area}` : "";
    if (digits.length > 2) result += `) ${p1}`;
    if (digits.length > 6) result += ` ${p2}`;
    return result;
  }
  return digits;
};

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await db.signup({
        firstName: firstName.trim(),
        lastName: surname.trim(),
        email,
        password,
        role: UserRole.APPLICANT,
        ...(contactNumber.trim()
          ? { contactNumber: contactNumber.trim() }
          : {}),
      });
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors relative overflow-hidden bg-zinc-50 dark:bg-black">
      {isLoading && <LoadingOverlay message="Creating Account..." />}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-lg glass-card rounded-3xl shadow-2xl shadow-zinc-200 dark:shadow-black/50 p-8 md:p-10 border border-white/20 dark:border-zinc-700 animate-slide-up relative">
        <Link
          to="/login"
          className="absolute top-6 left-6 text-zinc-400 hover:text-primary transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="text-center mb-8 mt-4">
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6 relative">
            <img
              src="/logo-light.png"
              alt="Al Siraat"
              className="w-full h-full object-contain dark:hidden drop-shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement!.innerHTML =
                  '<div class="w-16 h-16 bg-gradient-to-tr from-primary to-primaryHover rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-white w-9 h-9"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg></div>';
              }}
            />
            <img
              src="/logo-dark.png"
              alt="Al Siraat"
              className="w-full h-full object-contain hidden dark:block drop-shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                if (!e.currentTarget.parentElement!.querySelector("svg")) {
                  e.currentTarget.parentElement!.innerHTML =
                    '<div class="w-16 h-16 bg-gradient-to-tr from-primary to-primaryHover rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-white w-9 h-9"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg></div>';
                }
              }}
            />
          </div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 tracking-tighter">
            Create Account
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-bold uppercase tracking-widest text-[10px]">
            Join Tasker
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2 animate-shake">
            <AlertCircle className="w-5 h-5 text-red-800 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative group">
                <UserIcon className="absolute left-4 top-4 w-5 h-5 text-zinc-400 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  required
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-4 focus:ring-primary/20 outline-none text-sm font-bold dark:text-white transition-all backdrop-blur-md"
                />
              </div>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-4 w-5 h-5 text-zinc-400 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  required
                  placeholder="Last Name"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-4 focus:ring-primary/20 outline-none text-sm font-bold dark:text-white transition-all backdrop-blur-md"
                />
              </div>
            </div>

            <div className="relative group">
              <Mail className="absolute left-4 top-4 w-5 h-5 text-zinc-400 group-focus-within:text-primary transition-colors" />
              <input
                type="email"
                required
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-4 focus:ring-[#812349]/20 outline-none text-sm font-bold dark:text-white transition-all backdrop-blur-md"
              />
            </div>

            <div className="relative group">
              <Phone className="absolute left-4 top-4 w-5 h-5 text-zinc-400 group-focus-within:text-primary transition-colors" />
              <input
                type="tel"
                placeholder="04XX XXX XXX (optional)"
                value={contactNumber}
                onChange={(e) =>
                  setContactNumber(formatAustralianPhone(e.target.value))
                }
                maxLength={13}
                className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-4 focus:ring-primary/20 outline-none text-sm font-bold dark:text-white transition-all backdrop-blur-md"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-4 w-5 h-5 text-zinc-400 group-focus-within:text-primary transition-colors" />
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

          <button
            disabled={isLoading}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primaryHover shadow-xl shadow-primary/30 transition-all hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            Create Account
          </button>
        </form>

        <div className="mt-8 text-center space-y-4">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            Already have access?{" "}
            <Link to="/login" className="text-primary hover:underline ml-1">
              Sign In
            </Link>
          </p>
          <p className="text-[10px] text-zinc-400 font-medium">
            By creating an account, you agree to our{" "}
            <Link to="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
