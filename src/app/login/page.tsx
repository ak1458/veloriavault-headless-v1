"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";

type Mode = "password" | "otp";
type OtpStep = "email" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");

  // Password login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP login
  const [otpStep, setOtpStep] = useState<OtpStep>("email");
  const [code, setCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Invalid email or password");
        setLoading(false);
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send code");
        setLoading(false);
        return;
      }
      setOtpStep("code");
      setInfo(`If an order exists for ${email}, a 6-digit code is on its way. Check your inbox.`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid or expired code");
        setLoading(false);
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center px-4 pt-24 pb-16">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
        <h1 className="text-2xl font-serif text-gray-900 mb-2 text-center">Welcome Back</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Sign in to your Veloria Vault account</p>

        {/* Mode switch */}
        <div className="flex mb-6 bg-gray-50 rounded-lg p-1 border border-gray-100">
          <button
            onClick={() => { setMode("password"); setError(null); setInfo(null); }}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${
              mode === "password" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            }`}
          >
            Password
          </button>
          <button
            onClick={() => { setMode("otp"); setOtpStep("email"); setError(null); setInfo(null); }}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${
              mode === "otp" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            }`}
          >
            Email me a code
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        {info && (
          <div className="mb-4 p-3 bg-[#fcf8e8] border border-[#f0e6c8] rounded-lg">
            <p className="text-sm text-[#8a6d3b]">{info}</p>
          </div>
        )}

        {mode === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c]"
                placeholder="email@address.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c] pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a1a1a] text-white py-3 text-sm font-bold uppercase tracking-widest hover:bg-[#b59a5c] transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Sign In"}
            </button>
          </form>
        )}

        {mode === "otp" && otpStep === "email" && (
          <form onSubmit={handleOtpRequest} className="space-y-4">
            <p className="text-xs text-gray-500">
              Placed an order as a guest? Enter the email you used at checkout and we&apos;ll email you a one-time code to view your orders.
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c]"
                placeholder="email@address.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a1a1a] text-white py-3 text-sm font-bold uppercase tracking-widest hover:bg-[#b59a5c] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Mail size={16} /> Send Code</>}
            </button>
          </form>
        )}

        {mode === "otp" && otpStep === "code" && (
          <form onSubmit={handleOtpVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">6-Digit Code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c] tracking-[0.5em] text-center text-lg"
                placeholder="000000"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-[#1a1a1a] text-white py-3 text-sm font-bold uppercase tracking-widest hover:bg-[#b59a5c] transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify & Sign In"}
            </button>
            <button
              type="button"
              onClick={() => { setOtpStep("email"); setCode(""); setError(null); setInfo(null); }}
              className="w-full text-xs text-gray-500 hover:text-gray-800"
            >
              Use a different email
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#b59a5c] hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
