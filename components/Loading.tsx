import React, { useState, useEffect } from "react";

interface LoadingProps {
  fullScreen?: boolean;
  message?: string;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  fullScreen = false,
  message = "Loading...",
  className = "",
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Basic check for dark mode
    const isDark =
      document.documentElement.classList.contains("dark") ||
      localStorage.getItem("theme") === "dark";
    setIsDarkMode(isDark);
  }, []);

  if (fullScreen) {
    return (
      <div
        className={`flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-black overflow-hidden relative ${className}`}
      >
        {/* Background Decorative Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="relative">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary to-primary/20 animate-spin blur-sm opacity-30"></div>

            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 relative z-10 p-2">
              <img
                src={isDarkMode ? "/logo-dark.png" : "/logo-light.png"}
                alt="Logo"
                className="w-full h-full object-contain animate-float"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement!.innerHTML =
                    '<div class="w-16 h-16 bg-gradient-to-tr from-primary to-primaryHover rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 animate-float"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-white w-9 h-9"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg></div>';
                }}
              />
            </div>
          </div>
          <div className="text-zinc-400 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">
            {message}
          </div>
        </div>
      </div>
    );
  }

  // Overlay variant (for inside cards or containers)
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 ${className}`}
    >
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center animate-pulse p-1.5">
          <img
            src={isDarkMode ? "/logo-dark.png" : "/logo-light.png"}
            alt="Logo"
            className="w-full h-full object-contain animate-float"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement!.innerHTML =
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-primary w-6 h-6 animate-float"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>';
            }}
          />
        </div>
        {/* Circular spinner around the box */}
        <div className="absolute -inset-2 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
      <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest animate-pulse">
        {message}
      </p>
    </div>
  );
};

export const LoadingOverlay: React.FC<{ message?: string }> = ({
  message = "Processing...",
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark =
      document.documentElement.classList.contains("dark") ||
      localStorage.getItem("theme") === "dark";
    setIsDarkMode(isDark);
  }, []);

  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-black/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm animate-fade-in">
      <div className="relative mb-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center animate-float p-2">
          <img
            src={isDarkMode ? "/logo-dark.png" : "/logo-light.png"}
            alt="Logo"
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement!.innerHTML =
                '<div class="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 animate-float"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-white w-7 h-7"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg></div>';
            }}
          />
        </div>
        <div className="absolute -inset-3 border-2 border-primary/10 border-t-primary rounded-full animate-spin"></div>
      </div>
      <p className="font-bold text-zinc-900 dark:text-white text-sm tracking-wide">
        {message}
      </p>
    </div>
  );
};
