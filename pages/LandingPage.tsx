import { useState } from 'react';
import { Briefcase, CheckCircle, Users, Zap, Shield, TrendingUp, Code, Palette, PenTool, DollarSign, HeadphonesIcon, BarChart, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';



export function LandingPage() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <>
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between relative">
          
          {/* Mobile Menu Button - Left */}
          <div className="md:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-blue-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {showMobileMenu ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>

          {/* Logo - Center on Mobile, Left on Desktop */}
          <div className="flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2 md:static md:transform-none md:translate-x-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <span className="text-gray-900 font-bold text-xl md:text-base hidden sm:block md:block">Tasker</span>
              <span className="text-gray-900 font-bold text-xl sm:hidden md:hidden">Tasker</span>
            </div>
            
            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              <button
                
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Post a Job
              </button>
              <button className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                Categories
              </button>
              <button className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                Browse Jobs
              </button>
              <button className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                How it works
              </button>
            </nav>
          </div>

          {/* Mobile Action Button - Right (Get Started) */}
          <div className="md:hidden">
            <button
            onClick ={() => navigate('/signin')}
               
               className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-lg"
            >
               Sign In
            </button>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button
             onClick ={() => navigate('/signup')}
              
              className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
            >
              Sign up
            </button>
            <button
             onClick ={() => navigate('/signin')}
              
              className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
            >
              Log in
            </button>
            <button
              
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2 rounded-lg hover:shadow-lg transition-all text-sm"
            >
              Become a Tasker
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {showMobileMenu && (
          <div className="md:hidden bg-white border-b border-gray-200 px-4 py-4 space-y-4 shadow-lg absolute w-full left-0 z-50">
             <div className="flex flex-col gap-2">
                <button
                  
                  className="w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-2 text-gray-700 hover:bg-gray-50"
                >
                  Post a Job
                </button>
                <button
                  className="w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-2 text-gray-700 hover:bg-gray-50"
                >
                  Categories
                </button>
                <button
                  className="w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-2 text-gray-700 hover:bg-gray-50"
                >
                  Browse Jobs
                </button>
                <button
                  className="w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-2 text-gray-700 hover:bg-gray-50"
                >
                  How it works
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  
                  className="w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-2 text-gray-700 hover:bg-gray-50"
                >
                  Sign Up
                </button>
                <button
                  
                  className="w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-2 text-gray-700 hover:bg-gray-50"
                >
                  Log In
                </button>
                <button
                  
                  className="w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow-md"
                >
                  Become a Tasker
                </button>
             </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
        {/* Animated Background Layers */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Moving gradient orbs */}
          <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-6000"></div>
          
          {/* Floating particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white/30 rounded-full animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${5 + Math.random() * 10}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-white">
              <div className="inline-block mb-6">
                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm border border-white/30">
                  🚀 Connecting 10,000+ professionals worldwide
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight animate-fade-in-up">
                Find the right talent.
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-pink-200">
                  Get things done.
                </span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-blue-100 animate-fade-in-up animation-delay-200">
                Connect with skilled professionals or find your next opportunity. Our platform makes hiring and job hunting simple, secure, and efficient.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animation-delay-400">
                <button
                  
                  className="group bg-white text-blue-600 px-8 py-4 rounded-xl hover:shadow-2xl transition-all duration-300 text-lg hover:scale-105"
                >
                  <span className="flex items-center justify-center gap-2">
                    Post a Job
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </button>
                <button
                  
                  className="group bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl border-2 border-white/30 hover:bg-white/20 transition-all duration-300 text-lg hover:scale-105"
                >
                  <span className="flex items-center justify-center gap-2">
                    Find Work
                    <Briefcase className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  </span>
                </button>
              </div>
              <div className="flex items-center gap-8 mt-12 animate-fade-in-up animation-delay-600">
                <div className="text-center">
                  <div className="text-3xl mb-1">10,000+</div>
                  <div className="text-sm text-blue-200">Jobs Posted</div>
                </div>
                <div className="w-px h-12 bg-white/30"></div>
                <div className="text-center">
                  <div className="text-3xl mb-1">5,000+</div>
                  <div className="text-sm text-blue-200">Professionals</div>
                </div>
                <div className="w-px h-12 bg-white/30"></div>
                <div className="text-center">
                  <div className="text-3xl mb-1">98%</div>
                  <div className="text-sm text-blue-200">Success Rate</div>
                </div>
              </div>
            </div>

            {/* Right Content - Floating Job Cards */}
            <div className="relative h-[600px] hidden lg:block">
              {/* Card 1 - Floating animation */}
              <div className="absolute top-0 right-0 w-80 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl animate-float animation-delay-1000">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                    <Code className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-white">
                    <div className="text-sm">Senior Developer Needed</div>
                    <div className="text-xs text-blue-200">Posted 2 hours ago</div>
                  </div>
                </div>
                <div className="text-sm text-blue-100 mb-4">Looking for a React expert for an exciting project...</div>
                <div className="flex items-center justify-between">
                  <span className="text-white">$5,000 - $8,000</span>
                  <span className="px-3 py-1 bg-green-500/30 backdrop-blur-sm rounded-full text-xs text-green-200 border border-green-400/30">
                    ✓ Approved
                  </span>
                </div>
              </div>

              {/* Card 2 - Floating animation with delay */}
              <div className="absolute top-32 right-12 w-80 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl animate-float animation-delay-3000">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                    <Palette className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-white">
                    <div className="text-sm">UI/UX Designer</div>
                    <div className="text-xs text-blue-200">Posted 5 hours ago</div>
                  </div>
                </div>
                <div className="text-sm text-blue-100 mb-4">Need a creative designer for mobile app...</div>
                <div className="flex items-center justify-between">
                  <span className="text-white">$3,000 - $5,000</span>
                  <span className="px-3 py-1 bg-yellow-500/30 backdrop-blur-sm rounded-full text-xs text-yellow-200 border border-yellow-400/30">
                    ⏱ Pending
                  </span>
                </div>
              </div>

              {/* Card 3 - Floating animation with different delay */}
              <div className="absolute bottom-20 right-4 w-80 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl animate-float animation-delay-5000">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl flex items-center justify-center">
                    <PenTool className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-white">
                    <div className="text-sm">Content Writer</div>
                    <div className="text-xs text-blue-200">Posted 1 day ago</div>
                  </div>
                </div>
                <div className="text-sm text-blue-100 mb-4">Looking for creative writers for blog content...</div>
                <div className="flex items-center justify-between">
                  <span className="text-white">$2,000 - $4,000</span>
                  <span className="px-3 py-1 bg-green-500/30 backdrop-blur-sm rounded-full text-xs text-green-200 border border-green-400/30">
                    ✓ Approved
                  </span>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-1/2 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-yellow-300/10 rounded-full blur-xl animate-pulse animation-delay-2000"></div>
            </div>
          </div>
        </div>

        {/* Bottom wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-gray-900 mb-4">Popular Categories</h2>
            <p className="text-gray-600 text-lg">Find the perfect job in your field</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: Code, name: 'Development', count: '2,500+' },
              { icon: Palette, name: 'Design', count: '1,800+' },
              { icon: PenTool, name: 'Writing', count: '1,200+' },
              { icon: BarChart, name: 'Marketing', count: '1,600+' },
              { icon: DollarSign, name: 'Finance', count: '900+' },
              { icon: HeadphonesIcon, name: 'Support', count: '1,100+' },
            ].map((category) => (
              <button
                key={category.name}
                
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-600 hover:shadow-md transition-all group"
              >
                <category.icon className="w-8 h-8 text-blue-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-gray-900 mb-1">{category.name}</div>
                <div className="text-sm text-gray-500">{category.count} jobs</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-600 text-lg">Get started in three simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-gray-900 mb-3">1. Create Your Profile</h3>
              <p className="text-gray-600">
                Sign up and choose your role - whether you're posting jobs, approving them, or looking for opportunities.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-gray-900 mb-3">2. Post or Browse Jobs</h3>
              <p className="text-gray-600">
                Employers post jobs that go through our approval process. Job seekers browse verified opportunities.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-gray-900 mb-3">3. Connect & Succeed</h3>
              <p className="text-gray-600">
                Apply to jobs that match your skills or review applications from qualified candidates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-gray-900 mb-4">Why Choose JobConnect?</h2>
            <p className="text-gray-600 text-lg">Built for efficiency, security, and success</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-gray-900 mb-3">Verified Jobs</h3>
              <p className="text-gray-600">
                All job postings go through our approval process to ensure quality and legitimacy.
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-gray-900 mb-3">Fast Matching</h3>
              <p className="text-gray-600">
                Our smart system helps connect the right talent with the right opportunities quickly.
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-gray-900 mb-3">Track Progress</h3>
              <p className="text-gray-600">
                Monitor your job posts, applications, and approval status all in one dashboard.
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-gray-900 mb-3">Three-Tier System</h3>
              <p className="text-gray-600">
                Job posters, approvers, and applicants work together in a seamless workflow.
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-gray-900 mb-3">Quality Control</h3>
              <p className="text-gray-600">
                Dedicated approval team ensures only legitimate opportunities are published.
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-gray-900 mb-3">Diverse Opportunities</h3>
              <p className="text-gray-600">
                From tech to marketing, find jobs across multiple industries and skill levels.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of professionals and companies already using JobConnect
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              
              className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors text-lg"
            >
              I'm Looking for Talent
            </button>
            <button
              
              className="bg-blue-700 text-white px-8 py-4 rounded-lg hover:bg-blue-800 transition-colors text-lg border-2 border-white"
            >
              I'm Looking for Work
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <span className="text-white">JobConnect</span>
              </div>
              <p className="text-sm">
                Connecting talent with opportunity through a trusted, verified platform.
              </p>
            </div>
            <div>
              <div className="text-white mb-4">For Job Seekers</div>
              <ul className="space-y-2 text-sm">
                <li><button  className="hover:text-white transition-colors">Browse Jobs</button></li>
                <li><button  className="hover:text-white transition-colors">Create Profile</button></li>
                <li><button  className="hover:text-white transition-colors">Career Resources</button></li>
              </ul>
            </div>
            <div>
              <div className="text-white mb-4">For Employers</div>
              <ul className="space-y-2 text-sm">
                <li><button  className="hover:text-white transition-colors">Post a Job</button></li>
                <li><button  className="hover:text-white transition-colors">Find Talent</button></li>
                <li><button  className="hover:text-white transition-colors">Pricing</button></li>
              </ul>
            </div>
            <div>
              <div className="text-white mb-4">Company</div>
              <ul className="space-y-2 text-sm">
                <li><button className="hover:text-white transition-colors">About Us</button></li>
                <li><button className="hover:text-white transition-colors">Contact</button></li>
                <li><button className="hover:text-white transition-colors">Privacy Policy</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-sm text-center">
            <p>&copy; 2024 JobConnect. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  
  </>
  
  );
}