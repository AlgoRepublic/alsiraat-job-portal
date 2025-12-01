
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl shadow-zinc-200 dark:shadow-zinc-900/50 p-8 md:p-10 border border-zinc-100 dark:border-zinc-800 animate-slide-up">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-zinc-900 dark:bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <span className="text-white dark:text-zinc-900 font-bold text-3xl">H</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Welcome Back</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Sign in to your Hayati JobConnect account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
              <input 
                type="email" 
                placeholder="Email address"
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 outline-none text-sm dark:text-white transition-all"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
              <input 
                type="password" 
                placeholder="Password"
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 outline-none text-sm dark:text-white transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded border-zinc-300 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900" />
              <span className="text-zinc-600 dark:text-zinc-400">Remember me</span>
            </label>
            <a href="#" className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline">Forgot password?</a>
          </div>

          <button className="w-full py-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-lg shadow-zinc-200 dark:shadow-none transition-all hover:-translate-y-0.5">
            Sign In
          </button>
        </form>

        <div className="my-8 flex items-center">
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
          <span className="px-4 text-xs text-zinc-400 font-medium uppercase tracking-wide">Or continue with</span>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="flex items-center justify-center px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Google</span>
          </button>
          <button className="flex items-center justify-center px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
            <svg className="w-5 h-5 mr-2 text-zinc-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path d="M10.5 2H2.5C1.7 2 1 2.7 1 3.5v17c0 .8.7 1.5 1.5 1.5h19c.8 0 1.5-.7 1.5-1.5V11h-1.5v9.5H2.5v-17H12V2H10.5zM14 2v2h4.5l-9.1 9.1 1.4 1.4 9.1-9.1V10h2V2h-8z"/></svg>
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">SSO</span>
          </button>
        </div>

        <div className="mt-8 text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Don't have an account? <a href="#" className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline">Register</a>
            </p>
        </div>
      </div>
    </div>
  );
};
