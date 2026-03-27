"use client";

import { useState, useCallback } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { X, Mail, Lock, User, Github, Loader2 } from "lucide-react";

export default function AuthModal() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const close = useCallback(() => {
    setIsOpen(false);
    setName("");
    setEmail("");
    setPassword("");
    setError("");
    setLoading(false);
  }, []);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required");
      return;
    }
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      close();
    }
  };

  const handleOAuth = (provider: "google" | "github") => {
    signIn(provider, { callbackUrl: "/" });
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/landing" });
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex items-center gap-2">
        <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  // Signed-in state
  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <a
          href="/"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
        >
          Dashboard
        </a>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--surface-3)] border border-[var(--border-default)] flex items-center justify-center overflow-hidden">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-[var(--accent-primary)]">
                {(session.user.name || session.user.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-sm text-[var(--text-secondary)] hidden sm:inline">
            {session.user.name || session.user.email}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Signed-out state
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setMode("signin");
            setIsOpen(true);
          }}
          className="px-4 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-lg border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-transparent"
        >
          Sign In
        </button>
        <button
          onClick={() => {
            setMode("signup");
            setIsOpen(true);
          }}
          className="px-4 py-1.5 text-sm font-medium text-[var(--surface-0)] bg-[var(--accent-primary)] hover:bg-sky-300 transition-colors rounded-lg"
        >
          Sign Up
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />
          <div className="relative w-full max-w-md mx-4 bg-[var(--surface-1)] border border-[var(--border-default)] rounded-2xl shadow-2xl shadow-black/40 animate-slide-up">
            <div className="flex items-center justify-between p-6 pb-0">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {mode === "signin" ? "Welcome back" : "Create account"}
              </h2>
              <button
                onClick={close}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCredentialsSubmit} className="p-6 space-y-4">
              {/* OAuth buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-sm text-[var(--text-secondary)] transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth("github")}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-sm text-[var(--text-secondary)] transition-colors"
                >
                  <Github size={16} />
                  GitHub
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--border-default)]" />
                <span className="text-xs text-[var(--text-muted)]">
                  or continue with email
                </span>
                <div className="flex-1 h-px bg-[var(--border-default)]" />
              </div>

              {mode === "signup" && (
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-colors"
                  />
                </div>
              )}

              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-colors"
                />
              </div>

              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-colors"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[var(--accent-primary)] hover:bg-sky-300 text-[var(--surface-0)] font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {mode === "signin" ? "Sign In" : "Create Account"}
              </button>

              <p className="text-center text-xs text-[var(--text-muted)]">
                {mode === "signin"
                  ? "Don't have an account?"
                  : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="text-[var(--accent-primary)] hover:underline"
                >
                  {mode === "signin" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
