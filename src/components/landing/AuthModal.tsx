"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Mail, Lock, User, Github } from "lucide-react";

interface MockUser {
  name: string;
  email: string;
  avatar: string;
}

export default function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [user, setUser] = useState<MockUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("aerointel_user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setName("");
    setEmail("");
    setPassword("");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mockUser: MockUser = {
      name: name || email.split("@")[0] || "Pilot",
      email: email || "pilot@aerointel.io",
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}&backgroundColor=0c1018&textColor=38bdf8`,
    };
    localStorage.setItem("aerointel_user", JSON.stringify(mockUser));
    setUser(mockUser);
    close();
  };

  const handleOAuth = (provider: string) => {
    const mockUser: MockUser = {
      name: `${provider} User`,
      email: `user@${provider.toLowerCase()}.com`,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${provider}&backgroundColor=0c1018&textColor=38bdf8`,
    };
    localStorage.setItem("aerointel_user", JSON.stringify(mockUser));
    setUser(mockUser);
    close();
  };

  const handleSignOut = () => {
    localStorage.removeItem("aerointel_user");
    setUser(null);
  };

  if (user) {
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
            <span className="text-xs font-bold text-[var(--accent-primary)]">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm text-[var(--text-secondary)] hidden sm:inline">{user.name}</span>
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

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setMode("signin"); setIsOpen(true); }}
          className="px-4 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-lg border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-transparent"
        >
          Sign In
        </button>
        <button
          onClick={() => { setMode("signup"); setIsOpen(true); }}
          className="px-4 py-1.5 text-sm font-medium text-[var(--surface-0)] bg-[var(--accent-primary)] hover:bg-sky-300 transition-colors rounded-lg"
        >
          Sign Up
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
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

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* OAuth buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuth("Google")}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-sm text-[var(--text-secondary)] transition-colors"
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
                  onClick={() => handleOAuth("GitHub")}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-sm text-[var(--text-secondary)] transition-colors"
                >
                  <Github size={16} />
                  GitHub
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--border-default)]" />
                <span className="text-xs text-[var(--text-muted)]">or continue with email</span>
                <div className="flex-1 h-px bg-[var(--border-default)]" />
              </div>

              {mode === "signup" && (
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
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
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-colors"
                />
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[var(--accent-primary)] hover:bg-sky-300 text-[var(--surface-0)] font-medium text-sm transition-colors"
              >
                {mode === "signin" ? "Sign In" : "Create Account"}
              </button>

              <p className="text-center text-xs text-[var(--text-muted)]">
                {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
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
