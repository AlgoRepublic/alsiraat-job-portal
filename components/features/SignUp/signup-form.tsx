import React, { useState } from "react";
import { Mail, Lock, Briefcase, User, UserCheck, Users } from "lucide-react";
import { UserRole } from "../../../types";
import { useNavigate } from "react-router-dom";

const SignupForm = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>("job_applicant");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/");
  };

  return (
    <>
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-4">
          {/* Full Name Field */}
          <div className="relative">
            <User className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Full Name"
              className="w-full pl-12 pr-4 py-3  dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-zinc-500 outline-none text-sm dark:text-white transition-all"
            />
          </div>

          {/* Email Field */}
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
            <input
              type="email"
              placeholder="Email address"
              className="w-full pl-12 pr-4 py-3  dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-zinc-500 outline-none text-sm dark:text-white transition-all"
            />
          </div>

          {/* Password Field */}
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
            <input
              type="password"
              placeholder="Password"
              className="w-full pl-12 pr-4 py-3  dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-zinc-500 outline-none text-sm dark:text-white transition-all"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-3">I want to...</label>
          <div className="space-y-2">
            <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
              <input
                type="radio"
                name="role"
                value="job_applicant"
                checked={role === "job_applicant"}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="mr-3"
              />
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <div className="text-gray-900">Find Jobs</div>
                <div className="text-sm text-gray-500">
                  Apply for job postings
                </div>
              </div>
            </label>
            <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
              <input
                type="radio"
                name="role"
                value="job_poster"
                checked={role === "job_poster"}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="mr-3"
              />
              <Briefcase className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <div className="text-gray-900">Post Jobs</div>
                <div className="text-sm text-gray-500">Create job listings</div>
              </div>
            </label>
            <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
              <input
                type="radio"
                name="role"
                value="job_approval"
                checked={role === "job_approval"}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="mr-3"
              />
              <UserCheck className="w-5 h-5 text-purple-600 mr-2" />
              <div>
                <div className="text-gray-900">Approve Jobs</div>
                <div className="text-sm text-gray-500">
                  Review and approve postings
                </div>
              </div>
            </label>
          </div>
        </div>

        <button className="w-full py-3.5 bg-blue-600 text-white dark:bg-zinc-100  dark:text-zinc-900  rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 dark:hover:bg-zinc-200 shadow-lg shadow-zinc-200 dark:shadow-none transition-all hover:-translate-y-0.5">
          Sign Up
        </button>
      </form>
    </>
  );
};

export default SignupForm;
