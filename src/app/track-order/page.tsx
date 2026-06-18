"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Package, Search, Loader2, AlertCircle, ChevronRight, Truck, CheckCircle2, MapPin, RefreshCw, FileText, XCircle } from "lucide-react";

interface OrderDetails {
  id: number;
  number: string;
  status: string;
  total: string;
  dateCreated: string;
  billing: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postcode: string;
  };
  lineItems: Array<{
    name: string;
    quantity: number;
    total: string;
    image?: string;
  }>;
  shippingLines: Array<{
    methodTitle: string;
    total: string;
  }>;
}

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showReturn, setShowReturn] = useState(false);
  const [returnReason, setReturnReason] = useState("");

  const isCancellable = (s: string) => ["pending", "processing", "on-hold"].includes(s.toLowerCase());
  const isReturnable = (s: string) => ["processing", "completed"].includes(s.toLowerCase());

  const handleCancel = async () => {
    if (!order) return;
    if (!window.confirm(`Cancel order #${order.number}? If you paid online, your refund is processed automatically to your original payment method.`)) {
      return;
    }
    setActionLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMsg({ type: "err", text: data.error || "Could not cancel this order." });
      } else {
        setActionMsg({
          type: "ok",
          text: data.refunded
            ? "Order cancelled. Your refund has been initiated to your original payment method."
            : "Order cancelled.",
        });
        setOrder({ ...order, status: "cancelled" });
      }
    } catch {
      setActionMsg({ type: "err", text: "Something went wrong. Please try again." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/orders/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, email, reason: returnReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMsg({ type: "err", text: data.error || "Could not submit your return request." });
      } else {
        setActionMsg({ type: "ok", text: "Return request submitted. Our team will email you the next steps." });
        setShowReturn(false);
        setReturnReason("");
      }
    } catch {
      setActionMsg({ type: "err", text: "Something went wrong. Please try again." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      // Try to find order by order number and email
      const response = await fetch(`/api/orders/track?orderNumber=${encodeURIComponent(orderId)}&email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Order not found");
      }

      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to track order");
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pending" || s === "on-hold") return 1;
    if (s === "processing") return 2;
    if (s === "shipped") return 3;
    if (s === "out for delivery") return 4;
    if (s === "completed" || s === "delivered") return 5;
    return 1;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700",
      "on-hold": "bg-amber-100 text-amber-700",
      processing: "bg-blue-100 text-blue-700",
      shipped: "bg-purple-100 text-purple-700",
      "out for delivery": "bg-orange-100 text-orange-700",
      completed: "bg-green-100 text-green-700",
      delivered: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
      refunded: "bg-gray-100 text-gray-700",
    };
    return colors[status.toLowerCase()] || "bg-gray-100 text-gray-700";
  };

  const statusSteps = [
    { label: "Order Placed", icon: Package },
    { label: "Processing", icon: Loader2 },
    { label: "Shipped", icon: Truck },
    { label: "Out for Delivery", icon: MapPin },
    { label: "Delivered", icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-[#faf8f5] pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-serif font-medium text-gray-900 mb-4">
            Track Your Order
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto">
            Enter your order number and email address to track your order status.
          </p>
        </div>

        {/* Tracking Form */}
        {!order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm max-w-md mx-auto"
          >
            <form onSubmit={handleTrack} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  Order Number *
                </label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g., 9452"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c] transition-colors"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Found in your order confirmation email
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c] transition-colors"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  The email used when placing the order
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-[#1a1a1a] text-white py-4 text-sm font-bold uppercase tracking-widest hover:bg-[#b59a5c] transition-colors disabled:opacity-50 rounded-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Track Order</span>
                  </>
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <Link
                href="/login"
                className="inline-flex flex-col items-center group"
              >
                <span className="text-sm text-gray-500 mb-1 group-hover:text-gray-700">Have an account?</span>
                <span className="inline-flex items-center text-[#b59a5c] hover:text-[#a08a4f] font-medium">
                  View all your orders
                  <ChevronRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Order Details */}
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Back Button */}
            <button
              onClick={() => {
                setOrder(null);
                setError(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              ← Track another order
            </button>

            {/* Order Summary Card */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Order #{order.number}</p>
                  <h2 className="text-2xl font-serif font-medium text-gray-900">
                    {order.billing.firstName} {order.billing.lastName}
                  </h2>
                </div>
                <span
                  className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Order Date</p>
                  <p className="font-medium">{new Date(order.dateCreated).toLocaleDateString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Total Amount</p>
                  <p className="font-medium">₹{parseFloat(order.total).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Email</p>
                  <p className="font-medium">{order.billing.email}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Phone</p>
                  <p className="font-medium">{order.billing.phone}</p>
                </div>
              </div>
            </div>

            {/* Order Actions: cancel + refund, return, invoice */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-serif text-lg text-gray-900 mb-4">Manage Order</h3>

              {actionMsg && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm border ${
                    actionMsg.type === "ok"
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-red-50 border-red-200 text-red-600"
                  }`}
                >
                  {actionMsg.text}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {isCancellable(order.status) && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-bold uppercase tracking-wider hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                    Cancel & Refund
                  </button>
                )}

                {isReturnable(order.status) && (
                  <button
                    onClick={() => setShowReturn((v) => !v)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={16} /> Request Return
                  </button>
                )}

                <a
                  href={`/api/orders/invoice?orderId=${order.id}&email=${encodeURIComponent(email)}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors"
                >
                  <FileText size={16} /> Download Invoice
                </a>
              </div>

              {showReturn && (
                <form onSubmit={handleReturn} className="mt-5 border-t border-gray-100 pt-5 space-y-3">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Reason for return
                  </label>
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    rows={3}
                    minLength={5}
                    required
                    placeholder="Tell us what went wrong (damaged, wrong item, not as described, etc.)"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c] resize-none text-sm"
                  />
                  <button
                    type="submit"
                    disabled={actionLoading || returnReason.trim().length < 5}
                    className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-[#b59a5c] transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                    Submit Return Request
                  </button>
                </form>
              )}

              <p className="text-xs text-gray-400 mt-4">
                Orders can be cancelled within 24 hours of placing them (before they ship). Returns can be requested within 7 days of delivery.
              </p>
            </div>

            {/* Progress Tracker */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-serif text-lg text-gray-900 mb-6">Order Progress</h3>
              <div className="relative">
                {/* Progress Bar */}
                <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full hidden md:block">
                  <div
                    className="h-full bg-[#b59a5c] rounded-full transition-all duration-500"
                    style={{
                      width: `${((getStatusStep(order.status) - 1) / (statusSteps.length - 1)) * 100}%`,
                    }}
                  />
                </div>

                {/* Steps */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {statusSteps.map((step, index) => {
                    const StepIcon = step.icon;
                    const isActive = index < getStatusStep(order.status);
                    const isCurrent = index === getStatusStep(order.status) - 1;

                    return (
                      <div key={step.label} className="flex flex-col items-center text-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                            isActive || isCurrent
                              ? "bg-[#b59a5c] text-white"
                              : "bg-gray-200 text-gray-400"
                          }`}
                        >
                          <StepIcon className={`w-5 h-5 ${step.icon === Loader2 && isCurrent ? "animate-spin" : ""}`} />
                        </div>
                        <p
                          className={`text-xs font-medium ${
                            isActive || isCurrent ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-serif text-lg text-gray-900 mb-6">Order Items</h3>
              <div className="space-y-4">
                {order.lineItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">₹{parseFloat(item.total).toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>

              {/* Shipping */}
              {order.shippingLines.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{order.shippingLines[0].methodTitle}</span>
                    <span>₹{parseFloat(order.shippingLines[0].total).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-serif text-lg">Total</span>
                  <span className="font-serif text-xl font-medium text-[#b59a5c]">
                    ₹{parseFloat(order.total).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-serif text-lg text-gray-900 mb-4">Shipping Address</h3>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900">
                  {order.billing.firstName} {order.billing.lastName}
                </p>
                <p>{order.billing.address}</p>
                <p>
                  {order.billing.city}, {order.billing.state} {order.billing.postcode}
                </p>
                <p>India</p>
              </div>
            </div>

            {/* Support Links */}
            <div className="bg-[#1a1a1a] text-white p-6 rounded-2xl">
              <h3 className="font-medium mb-2">Need Help?</h3>
              <p className="text-sm text-gray-300 mb-4">
                If you have any questions about your order, contact our support team.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="tel:+917376326666"
                  className="text-sm text-[#b59a5c] hover:text-[#a08a4f]"
                >
                  Call: +91 7376326666
                </a>
                <span className="text-gray-600 hidden sm:inline">|</span>
                <a
                  href="mailto:care@veloriavault.com"
                  className="text-sm text-[#b59a5c] hover:text-[#a08a4f]"
                >
                  Email: care@veloriavault.com
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
