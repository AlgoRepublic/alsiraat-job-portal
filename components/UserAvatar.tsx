import React, { useState } from "react";
import { User } from "lucide-react";

interface UserAvatarProps {
  src?: string;
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  className = "",
  size = "md",
}) => {
  const [error, setError] = useState(false);

  // Get initials
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "?";

  // Generate consistent background color based on name
  const getColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      "bg-red-500",
      "bg-orange-500",
      "bg-amber-500",
      "bg-yellow-500",
      "bg-lime-500",
      "bg-green-500",
      "bg-emerald-500",
      "bg-teal-500",
      "bg-cyan-500",
      "bg-sky-500",
      "bg-blue-500",
      "bg-indigo-500",
      "bg-violet-500",
      "bg-purple-500",
      "bg-fuchsia-500",
      "bg-pink-500",
      "bg-rose-500",
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const bgColor = getColor(name || "default");

  const sizeClasses = {
    sm: "w-8 h-8 text-[10px]",
    md: "w-10 h-10 text-xs",
    lg: "w-12 h-12 text-sm",
    xl: "w-16 h-16 text-base",
  };

  if (src && !error) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClasses[size]} rounded-xl object-cover shadow-sm border border-white/50 ${className}`}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-xl flex items-center justify-center font-black text-white shadow-sm border border-white/50 ${bgColor} ${className}`}
    >
      {initials}
    </div>
  );
};
