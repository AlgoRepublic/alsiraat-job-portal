import React from "react";

import {  Briefcase } from "lucide-react";

import SignupForm from "@/components/features/SignUp/signup-form";

export const Register: React.FC = () => {
  


  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl shadow-zinc-200 dark:shadow-zinc-900/50 p-8 md:p-10 border border-zinc-100 dark:border-zinc-800 animate-slide-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            Job Portal
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Connect talent with opportunities
          </p>
        </div>

       <SignupForm />

        <div className="mt-8 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Already have an account?{" "}
            <a
              href="/sign-in"
              className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline"
            >
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
