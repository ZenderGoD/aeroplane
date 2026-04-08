"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Mail, Lock, User, Github, Loader2 } from "lucide-react";
import { signIn, signUp, signOut, useSession } from "@/lib/auth-client";

export default function AuthModal() {
  const { data: session, isPending } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setName("");
    setEmail("");
    setPassword("");
    setError("");
    setLoading(false);
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");

    try {
      if (mode === "signup") {
        const { error: err } = await signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
        });
        if (err) {
          setError(err.message || "Failed to create account");
          setLoading(false);
          return;
        }
      } else {
        const { error: err } = await signIn.email({
          email,
          password,
        });
        if (err) {
          setError(err.message || "Invalid email or password");
          setLoading(false);
          return;
        }
      }
      close();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    await signIn.social({
      provider,
      callbackURL: "/tracker",
    });
  };

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  };

  // Loading state
  if (isPending) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 size={16} className="animate-spin text-white/40" />
      </div>
    );
  }

  // Signed-in state
  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <a
          href="/tracker"
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Dashboard
        </a>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center overflow-hidden">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-white/70">
                {(session.user.name || session.user.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-sm text-white/60 hidden sm:inline">
            {session.user.name || session.user.email}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Modal content — rendered via portal to escape nav's backdrop-filter
  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={close}
      />
      <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-lg font-semibold text-white">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h2>
          <button
            onClick={close}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleEmailSubmit} className="p-6 space-y-4">
          {/* OAuth buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-sm text-white/70 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth("github")}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-sm text-white/70 transition-colors"
            >
              <Github size={16} />
              GitHub
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-xs text-white/30">or continue with email</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {mode === "signup" && (
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 focus:ring-1 focus:ring-white/20 transition-colors"
              />
            </div>
          )}

          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 focus:ring-1 focus:ring-white/20 transition-colors"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="password"
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 focus:ring-1 focus:ring-white/20 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400/80 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {mode === "signin" ? "Sign In" : "Create Account"}
          </button>

          <p className="text-center text-xs text-white/30">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-white/70 hover:text-white hover:underline"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  ) : null;

  // Signed-out state
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setMode("signin"); setIsOpen(true); }}
          className="px-4 py-1.5 text-sm text-white/60 hover:text-white transition-colors rounded-lg border border-white/[0.1] hover:border-white/20 bg-transparent"
        >
          Sign In
        </button>
        <button
          onClick={() => { setMode("signup"); setIsOpen(true); }}
          className="px-4 py-1.5 text-sm font-medium text-black bg-white hover:bg-white/90 transition-colors rounded-lg"
        >
          Sign Up
        </button>
      </div>

      {/* Portal modal to body — escapes nav's backdrop-filter containing block */}
      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
