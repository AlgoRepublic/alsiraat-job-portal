import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Mail, Lock, Shield, AlertCircle, Layers } from "lucide-react";
import { db } from "../services/database";
import { API_BASE_URL } from "../services/api";
import { Permission } from "../types";

import { LoadingOverlay } from "../components/Loading";
import { Button, Card, Input, Label } from "@/components/ui";

export const Login: React.FC<{ onLoginSuccess?: () => void }> = ({
  onLoginSuccess,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSSOLoading, setIsSSOLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Handle SSO callback: URL has ?token=... (and optionally ?source=google|oidc, ?idToken=...) after redirect from OIDC/Google
  useEffect(() => {
    const token = searchParams.get("token");
    const idTokenParam = searchParams.get("idToken");
    const sourceParam = searchParams.get("source");
    const errorParam = searchParams.get("error");
    if (errorParam === "auth_failed") {
      setError("SSO sign-in was cancelled or failed. Please try again.");
      setSearchParams({}, { replace: true });
      return;
    }
    if (!token) return;

    if (idTokenParam) {
      try {
        localStorage.setItem("id_token", idTokenParam);
      } catch (_) {}
    }

    const loginSource = sourceParam === "oidc" ? "sso" : sourceParam || undefined;

    let cancelled = false;
    (async () => {
      setIsSSOLoading(true);
      setError("");
      try {
        const user = await db.completeSSOLogin(token, loginSource);
        if (cancelled) return;
        setSearchParams({}, { replace: true });
        if (onLoginSuccess) await onLoginSuccess();
        if (user?.permissions?.includes(Permission.DASHBOARD_VIEW)) {
          navigate("/dashboard");
        } else {
          navigate("/jobs");
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "SSO sign-in failed. Please try again.");
          setSearchParams({}, { replace: true });
        }
      } finally {
        if (!cancelled) setIsSSOLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await db.login(email, password);

      // Trigger global state update
      if (onLoginSuccess) {
        await onLoginSuccess();
      }

      // Get updated user info
      const user = await db.getCurrentUser();

      // Permission-based redirect
      if (user?.permissions?.includes(Permission.DASHBOARD_VIEW)) {
        navigate("/dashboard");
      } else {
        navigate("/jobs");
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
      setIsLoading(false);
    }
  };

  const handleEntraLogin = () => {
    const authUrl = API_BASE_URL.replace(/\/api$/, "") + "/api/auth/oidc";
    window.location.href = authUrl;
  };

  const handleGoogleLogin = () => {
    // Replace /api with /auth/google since API_BASE_URL likely ends with /api
    const authUrl = API_BASE_URL.replace(/\/api$/, "") + "/api/auth/google";
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors relative overflow-hidden bg-background">
      {(isLoading || isSSOLoading) && (
        <LoadingOverlay
          message={isSSOLoading ? "Completing sign-in..." : "Authenticating..."}
        />
      )}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]"></div>
      </div>

      <Card radius="surface" padding="section" className="w-full max-w-md animate-slide-up relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6 relative">
            <img
              src="/logo-light.png"
              alt="Al Siraat"
              className="w-full h-full object-contain dark:hidden drop-shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement!.innerHTML =
                  '<div class="w-16 h-16 bg-gradient-to-tr from-primary to-primaryHover rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-white w-9 h-9"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg></div>';
              }}
            />
            <img
              src="/logo-dark.png"
              alt="Al Siraat"
              className="w-full h-full object-contain hidden dark:block drop-shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                if (!e.currentTarget.parentElement!.querySelector("svg")) {
                  e.currentTarget.parentElement!.innerHTML =
                    '<div class="w-16 h-16 bg-gradient-to-tr from-primary to-primaryHover rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-white w-9 h-9"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg></div>';
                }
              }}
            />
          </div>
          <h1 className="text-title-page-lg font-semibold text-foreground mb-2 tracking-tight">
            Tasker
          </h1>
        </div>

        <div className="mb-6 space-y-3">
          <Button
            type="button"
            className="w-full relative"
            onClick={handleEntraLogin}
          >
            <Shield className="w-5 h-5 absolute left-4" />
            Sign in with SSO
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="w-full relative"
            onClick={handleGoogleLogin}
          >
            <span className="absolute left-4 flex items-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </span>
            Sign in with Google
          </Button>
        </div>

        <div className="flex items-center mb-6">
          <div className="flex-1 h-px bg-border"></div>
          <span className="px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
            Access your Account
          </span>
          <div className="flex-1 h-px bg-border"></div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2 animate-shake">
            <AlertCircle className="w-5 h-5 text-red-800 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  required
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded-control border-border text-primary focus:ring-primary/30"
              />
              <span className="text-muted-foreground font-medium">
                Remember me
              </span>
            </label>
            <Link
              to="/forgot-password"
              className="font-semibold text-primary hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            Login
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground font-medium">
            No account?{" "}
            <Link to="/signup" className="text-primary hover:underline ml-1">
              Sign up
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>
            By signing in, you agree to our{" "}
            <Link to="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
