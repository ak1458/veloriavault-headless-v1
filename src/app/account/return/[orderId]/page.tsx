"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, RefreshCw } from "lucide-react";

interface ReturnPageProps {
  params: Promise<{ orderId: string }>;
}

export default function ReturnPage({ params }: ReturnPageProps) {
  const { orderId } = use(params);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/orders/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not submit your return request.");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfaf7] py-12 px-4 sm:px-6 lg:px-8 pt-24">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {done ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-serif mb-2">Return Request Submitted</h1>
              <p className="text-gray-600 mb-6">
                We&apos;ve received your request for order #{orderId}. Our team will review it and email you the next steps within 1–2 business days.
              </p>
              <Link href="/account" className="inline-block bg-[#1a1a1a] text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#b59a5c] transition-colors rounded">
                Back to My Account
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-5 h-5 text-[#b59a5c]" />
                <h1 className="text-2xl font-serif">Request a Return</h1>
              </div>
              <p className="text-gray-500 text-sm mb-6">Order #{orderId}</p>

              <div className="bg-[#fcf8e8] border border-[#f0e6c8] p-4 rounded-lg mb-6">
                <p className="text-sm text-[#8a6d3b]/90">
                  Returns can be requested within 7 days of delivery. The product must be unused and in original packaging.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Reason for return
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    minLength={5}
                    required
                    placeholder="Tell us what went wrong (wrong item, damaged, not as described, etc.)"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c] resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || reason.trim().length < 5}
                  className="w-full bg-[#1a1a1a] text-white py-3 text-sm font-bold uppercase tracking-widest hover:bg-[#b59a5c] transition-colors disabled:opacity-50 rounded"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Submit Return Request"}
                </button>
              </form>

              <p className="text-xs text-gray-400 mt-4 text-center">
                Need help? Email <a className="underline" href="mailto:care@veloriavault.com">care@veloriavault.com</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
