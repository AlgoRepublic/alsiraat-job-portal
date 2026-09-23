import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Shield,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Send,
} from "lucide-react";
import { db } from "../services/database";

import { LoadingOverlay } from "../components/Loading";
import { Button, Card, Input, Label } from "@/components/ui";

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors relative overflow-hidden bg-background">
      {isLoading && <LoadingOverlay message="Dispatching Request..." />}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px]"></div>
      </div>

      <Card radius="surface" padding="section" className="w-full max-w-md animate-slide-up relative">
        <Link
          to="/login"
          className="absolute top-4 left-4 text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="text-center mb-8 mt-4">
          <div className="w-14 h-14 bg-primary rounded-control flex items-center justify-center mx-auto mb-4">
            <Shield className="text-white w-7 h-7" strokeWidth={2} />
          </div>
          <h1 className="text-title-page-lg font-semibold text-foreground mb-2">
            Reset Key
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
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
              className="inline-flex items-center gap-2 text-muted-foreground font-semibold text-sm hover:text-primary transition-colors"
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
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    required
                    placeholder="Registered Work Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                <Send className="w-4 h-4" /> Send Request
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
};
