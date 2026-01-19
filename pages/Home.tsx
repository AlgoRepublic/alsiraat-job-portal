import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  Users,
  Award,
  Shield,
  Layers,
  Rocket,
  Zap,
  Target,
} from "lucide-react";

export const Home: React.FC = () => {
  return (
    <div className="space-y-16 animate-fade-in pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[3rem] bg-zinc-900 text-white shadow-2xl p-12 md:p-20 text-center lg:text-left border border-white/5">
        <div className="absolute top-0 right-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-red-600 rounded-full mix-blend-screen filter blur-[150px] opacity-20"></div>

        <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
              <Award className="w-4 h-4 text-red-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
                Al-Siraat Portal v1.0
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9]">
              Empower <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-blue-500 to-purple-500">
                Your Journey.
              </span>
            </h1>
            <p className="text-zinc-400 text-lg md:text-xl leading-relaxed max-w-xl font-medium">
              The ultimate opportunity portal for schools and colleges. Connect
              students with roles, manage academic tasks, and track professional
              growth in real-time.
            </p>
            <div className="flex flex-wrap gap-5 justify-center lg:justify-start">
              <Link
                to="/jobs"
                className="px-10 py-5 bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-red-600/30 hover:bg-red-500 transition-all transform hover:-translate-y-1 flex items-center"
              >
                Explore Roles <ArrowRight className="w-5 h-5 ml-3" />
              </Link>
              <Link
                to="/dashboard"
                className="px-10 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-widest backdrop-blur-xl hover:bg-white/10 transition-all"
              >
                View Dashboard
              </Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: Target, label: "Excellence", desc: "Higher standards" },
                { icon: Users, label: "Community", desc: "Verified students" },
                { icon: Zap, label: "Growth", desc: "Skill development" },
                {
                  icon: Shield,
                  label: "Trust",
                  desc: "Secure academic portal",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`p-8 rounded-[2rem] glass-card border-white/10 group hover:-translate-y-2 transition-all duration-500 ${i % 2 === 0 ? "mt-8" : ""}`}
                >
                  <item.icon className="w-10 h-10 mb-6 text-red-500 group-hover:scale-110 transition-transform" />
                  <h3 className="font-black text-xl text-white tracking-tighter">
                    {item.label}
                  </h3>
                  <p className="text-sm text-zinc-500 font-bold mt-2">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Value Props */}
      <div className="grid md:grid-cols-3 gap-8">
        <div className="glass-card p-10 rounded-[2.5rem] text-center group hover:shadow-2xl transition-all">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-8 text-red-600 group-hover:scale-110 transition-transform shadow-xl">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">
            For Students
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
            Access academic opportunities, earn credits or rewards, and build a
            verified portfolio to showcase your growth within the institution.
          </p>
        </div>
        <div className="glass-card p-10 rounded-[2.5rem] text-center group hover:shadow-2xl transition-all">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-8 text-blue-600 group-hover:scale-110 transition-transform shadow-xl">
            <Rocket className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">
            For Faculty
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
            Post new opportunities for students. Automate role assignments and
            track academic support contributions with ease.
          </p>
        </div>
        <div className="glass-card p-10 rounded-[2.5rem] text-center group hover:shadow-2xl transition-all">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mx-auto mb-8 text-emerald-600 group-hover:scale-110 transition-transform shadow-xl">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">
            For Administrators
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
            Maintain quality standards, approve postings, and oversee
            institutional roles through a centralized management layer.
          </p>
        </div>
      </div>
    </div>
  );
};
