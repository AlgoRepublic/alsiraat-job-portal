import { useState } from 'react';
import { Briefcase, CheckCircle, Users, Zap, Shield, TrendingUp, Code, Palette, PenTool, DollarSign, HeadphonesIcon, BarChart, Menu, X, CheckCircle2, Rocket, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          
          <div className="md:hidden">
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 text-red-900 rounded-xl transition-colors">
              {showMobileMenu ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>

          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-gray-900 font-black text-2xl tracking-tighter">Tasker</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              <button onClick={onGetStarted} className="text-gray-600 hover:text-red-600 transition-colors text-sm font-bold">Find Tasks</button>
              <button className="text-gray-600 hover:text-red-600 transition-colors text-sm font-bold">Post a Task</button>
              <button className="text-gray-600 hover:text-red-600 transition-colors text-sm font-bold">Categories</button>
              <button className="text-gray-600 hover:text-red-600 transition-colors text-sm font-bold">Enterprise</button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={onGetStarted} className="hidden md:block text-gray-700 font-bold text-sm px-4">Log in</button>
            <button
              onClick={onGetStarted}
              className="bg-red-900 text-white px-6 py-2.5 rounded-xl hover:bg-red-800 transition-all font-bold text-sm shadow-xl shadow-red-900/10"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-[#0a0a0f]">
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob animation-delay-4000"></div>
          
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-md mb-8">
                <Rocket className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold text-white/80 uppercase tracking-widest">The Future of Work is Modular</span>
              </div>
              <h1 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter leading-[0.9]">
                Assign. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-blue-500 to-purple-500">
                  Complete.
                </span> <br />
                Done.
              </h1>
              <p className="text-xl text-gray-400 mb-10 max-w-xl leading-relaxed">
                Tasker is the modern ecosystem for organizational productivity. Connect with specialized talent, assign verified tasks, and scale your operations with ease.
              </p>
              <div className="flex flex-col sm:flex-row gap-5">
                <button
                  onClick={onGetStarted}
                  className="bg-red-600 text-white px-10 py-5 rounded-2xl hover:bg-red-500 hover:scale-105 transition-all text-lg font-black shadow-2xl shadow-red-600/20 flex items-center justify-center gap-3"
                >
                  Create Task <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={onGetStarted}
                  className="bg-white/5 border border-white/10 text-white px-10 py-5 rounded-2xl hover:bg-white/10 hover:scale-105 transition-all text-lg font-black backdrop-blur-xl"
                >
                  Browse Tasks
                </button>
              </div>
              
              <div className="mt-16 pt-12 border-t border-white/5 flex gap-12">
                 <div>
                    <div className="text-white text-3xl font-black mb-1">2.4k+</div>
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">Active Taskers</div>
                 </div>
                 <div>
                    <div className="text-white text-3xl font-black mb-1">12k+</div>
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">Tasks Resolved</div>
                 </div>
                 <div>
                    <div className="text-white text-3xl font-black mb-1">4.9/5</div>
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">Satisfaction</div>
                 </div>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="glass-card p-8 rounded-3xl border-white/10 relative z-20 animate-float">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/30">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                     </div>
                     <div>
                        <div className="text-white text-lg font-black">Project Task Alpha</div>
                        <div className="text-red-500 text-xs font-bold">Priority: High</div>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div className="h-4 bg-white/10 rounded-full w-full"></div>
                     <div className="h-4 bg-white/10 rounded-full w-[80%]"></div>
                     <div className="h-4 bg-white/10 rounded-full w-[60%]"></div>
                  </div>
                  <div className="mt-10 flex justify-between items-center pt-8 border-t border-white/5">
                      <div className="flex -space-x-3">
                         {[1,2,3,4].map(i => <div key={i} className="w-10 h-10 rounded-xl bg-zinc-800 border-2 border-zinc-900 overflow-hidden"><img src={`https://i.pravatar.cc/100?u=${i}`} alt="" /></div>)}
                      </div>
                      <div className="text-white font-black text-xl">$1,450.00</div>
                  </div>
              </div>
              
              {/* Decorative side cards */}
              <div className="absolute top-[-40px] right-[-20px] glass-card p-6 rounded-2xl border-white/10 z-10 opacity-60 scale-90 blur-[1px]">
                  <Zap className="text-blue-500 mb-2" />
                  <div className="text-white text-sm font-bold">Quick Match</div>
              </div>
              <div className="absolute bottom-[-30px] left-[-20px] glass-card p-6 rounded-2xl border-white/10 z-10 opacity-60 scale-90 blur-[1px]">
                  <Shield className="text-green-500 mb-2" />
                  <div className="text-white text-sm font-bold">Verified Sec</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">Task Categories</h2>
            <button onClick={onGetStarted} className="text-red-600 font-bold hover:underline flex items-center gap-2">View all <ArrowRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[
              { icon: Code, name: 'Eng', color: 'bg-blue-50 text-blue-600' },
              { icon: Palette, name: 'Design', color: 'bg-red-50 text-red-600' },
              { icon: PenTool, name: 'Copy', color: 'bg-orange-50 text-orange-600' },
              { icon: BarChart, name: 'Growth', color: 'bg-green-50 text-green-600' },
              { icon: DollarSign, name: 'Finance', color: 'bg-purple-50 text-purple-600' },
              { icon: HeadphonesIcon, name: 'Ops', color: 'bg-zinc-100 text-zinc-900' },
            ].map((cat) => (
              <button key={cat.name} onClick={onGetStarted} className="group p-8 rounded-3xl border border-gray-100 hover:border-red-600 hover:shadow-2xl transition-all text-center">
                <div className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-sm`}>
                  <cat.icon className="w-7 h-7" />
                </div>
                <div className="text-gray-900 font-black tracking-tight">{cat.name}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-gray-900 font-black text-xl">Tasker</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                The enterprise task orchestration platform for high-growth teams and individual taskers.
              </p>
            </div>
            <div>
              <h4 className="text-gray-900 font-bold mb-6">Platform</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <li><button onClick={onGetStarted}>Marketplace</button></li>
                <li><button onClick={onGetStarted}>Task Boards</button></li>
                <li><button onClick={onGetStarted}>API Access</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-bold mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <li><button onClick={onGetStarted}>About</button></li>
                <li><button onClick={onGetStarted}>Careers</button></li>
                <li><button onClick={onGetStarted}>Support</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-bold mb-6">Legal</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <li><button>Terms</button></li>
                <li><button>Privacy</button></li>
                <li><button>Compliance</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-gray-100 text-center text-sm text-gray-400 font-medium">
            &copy; 2025 Tasker Systems Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}