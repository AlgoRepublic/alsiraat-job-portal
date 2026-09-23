import React, { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Lock,
  Shield,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Key,
} from "lucide-react";
import { db } from "../services/database";

import { LoadingOverlay } from "../components/Loading";
import { Button, Card, Input, Label } from "@/components/ui";

export const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!token) {
      setError("Invalid reset token");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      await db.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Reset failed. link may have expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors relative overflow-hidden bg-background">
      {isLoading && <LoadingOverlay message="Updating Passkey..." />}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]"></div>
      </div>

      <Card radius="surface" padding="section" className="w-full max-w-md animate-slide-up relative">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-control flex items-center justify-center mx-auto mb-4">
            <Key className="text-white w-7 h-7" strokeWidth={2.5} />
          </div>
          <h1 className="text-title-page-lg font-semibold text-foreground mb-2">
            New Passkey
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Re-authorise Account
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-left">
                <h3 className="text-emerald-900 dark:text-emerald-400 font-bold mb-1">
                  Success!
                </h3>
                <p className="text-emerald-800 dark:text-emerald-300 text-sm">
                  Your password has been updated. Redirecting to entry point...
                </p>
              </div>
            </div>
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

            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      required
                      placeholder="New Security Key"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      required
                      placeholder="Confirm Key"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                Update Authorisation
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
};
