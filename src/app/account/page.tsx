"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, User, LogOut, ChevronRight, Loader2, Truck, RefreshCw, HelpCircle, CheckCircle2, MapPin, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Customer {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  isPayingCustomer: boolean;
}

interface Order {
  id: number;
  number: string;
  status: string;
  total: string;
  amountPaid: string;
  paymentMethod: string;
  paymentId: string | null;
  dateCreated: string;
  lineItems: { name: string; quantity: number; total: string }[];
}

interface LiveTracking {
  status: string;
  awb: string | null;
  etaDate: string | null;
  fallback: boolean;
  orderStatus: string;
  checkpoints: { date: string; activity: string; location: string }[];
}

type TabType = 'orders' | 'profile' | 'track' | 'returns' | 'support';

export default function AccountPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [isSearchingTracking, setIsSearchingTracking] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [liveTracking, setLiveTracking] = useState<LiveTracking | null>(null);

  const handleTrackOrder = async (order: Order) => {
    setActiveTab('track');
    setTrackingOrder(order);
    setLiveTracking(null);
    setIsSearchingTracking(true);
    try {
      const res = await fetch(`/api/orders/track-live?orderId=${order.id}`);
      if (res.ok) {
        setLiveTracking(await res.json());
      }
    } catch {
      // fall back to status-only view
    } finally {
      setIsSearchingTracking(false);
    }
  };

  const getStatusStep = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pending" || s === "processing") return 1;
    if (s === "shipped") return 2;
    if (s === "out for delivery") return 3;
    if (s === "completed" || s === "delivered") return 4;
    return 1;
  };

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/account/orders");
      if (!response.ok) {
        router.push("/login");
        return;
      }
      const data = await response.json();
      setOrders(data.orders || []);
      setSessionEmail(data.email || null);

      // Registered customers also get their full profile for the card + profile tab.
      if (data.sessionType === "customer") {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const me = await meRes.json();
          setCustomer(me.customer);
        }
      }
    } catch {
      setError("Failed to load account");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const handleCancel = async (order: Order) => {
    if (!window.confirm(`Cancel order #${order.number}? If it was prepaid, your payment will be refunded.`)) {
      return;
    }
    setCancellingId(order.id);
    try {
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error || "Could not cancel this order.");
      } else {
        window.alert(data.refunded ? "Order cancelled. Your refund has been initiated." : "Order cancelled.");
        await fetchProfile();
      }
    } catch {
      window.alert("Something went wrong. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  const isCancellable = (status: string) => ["pending", "processing", "on-hold"].includes(status.toLowerCase());

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#b59a5c]" />
      </div>
    );
  }

  // Allow both registered-customer and guest (OTP) sessions.
  if (!customer && !sessionEmail) {
    return null;
  }

  const displayName = customer?.displayName || sessionEmail || "Guest";
  const displayEmail = customer?.email || sessionEmail || "";
  const firstInitial = (customer?.firstName || sessionEmail || "G").charAt(0).toUpperCase();
  const greetingName = customer?.firstName || sessionEmail || "there";

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700",
      processing: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-8">
          <h1 className="text-3xl font-serif text-gray-900 mb-2">My Account</h1>
          <p className="text-gray-500">Welcome back, {greetingName}</p>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden sticky top-24">
              <div className="p-6 border-b border-gray-100 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-[#fbf9f4] rounded-full flex items-center justify-center mb-4 border border-[#eee7d5]">
                  <span className="text-3xl font-serif text-[#b59a5c]">
                    {firstInitial}
                  </span>
                </div>
                <h2 className="font-medium text-gray-900 text-lg break-all">{displayName}</h2>
                <p className="text-sm text-gray-500 break-all">{displayEmail}</p>
              </div>

              <nav className="p-3 space-y-1">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'orders' ? "bg-[#fbf9f4] text-[#b59a5c]" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Package size={18} />
                  My Orders
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'profile' ? "bg-[#fbf9f4] text-[#b59a5c]" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <User size={18} />
                  Profile Details
                </button>
                <button
                  onClick={() => {
                    if (!trackingOrder && orders.length > 0) {
                      handleTrackOrder(orders[0]); // Auto select + track most recent order
                    } else {
                      setActiveTab('track');
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'track' ? "bg-[#fbf9f4] text-[#b59a5c]" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Truck size={18} />
                  Track Order
                </button>
                <button
                  onClick={() => setActiveTab('returns')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'returns' ? "bg-[#fbf9f4] text-[#b59a5c]" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <RefreshCw size={18} />
                  Returns & Refunds
                </button>
                <button
                  onClick={() => setActiveTab('support')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'support' ? "bg-[#fbf9f4] text-[#b59a5c]" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <HelpCircle size={18} />
                  Support
                </button>
                <div className="pt-2 mt-2 border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 lg:p-8 min-h-[500px]">
              <AnimatePresence mode="wait">
                {activeTab === 'orders' && (
                  <motion.div
                    key="orders"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-xl font-serif text-gray-900 border-b-2 border-[#b59a5c] pb-1 inline-block">Order History</h2>
                    </div>

                    {orders.length === 0 ? (
                      <div className="text-center py-16 bg-gray-50 border border-gray-100 rounded-xl">
                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="font-serif text-lg text-gray-800 mb-2">No orders found</h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">When you place an order, it will appear here along with its status.</p>
                        <Link
                          href="/shop"
                          className="inline-block bg-[#1a1a1a] text-white px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-[#b59a5c] transition-colors rounded"
                        >
                          Start Shopping
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {orders.map((order) => (
                          <div
                            key={order.id}
                            className="border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow relative overflow-hidden"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-4 border-b border-gray-50">
                              <div className="mb-2 sm:mb-0">
                                <p className="text-sm text-gray-500 mb-1">
                                  Placed on <span className="font-medium text-gray-800">{new Date(order.dateCreated).toLocaleDateString("en-IN", { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </p>
                                <span className="text-base font-bold text-gray-900">
                                  Order #{order.number}
                                </span>
                              </div>
                              <div className="flex flex-col sm:items-end gap-2">
                                <span
                                  className={`px-3 py-1 rounded text-xs font-bold tracking-wider uppercase border ${getStatusColor(
                                    order.status
                                  )}`}
                                >
                                  {order.status}
                                </span>
                                <span className="font-bold text-gray-900 text-lg">
                                  ₹{parseFloat(order.amountPaid).toLocaleString("en-IN")}
                                </span>
                                {order.paymentMethod && (
                                  <span className="text-[11px] text-gray-400">Paid via {order.paymentMethod}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <p className="text-sm text-gray-600">
                                Includes: {order.lineItems.map(item => item.name).join(", ")}
                              </p>
                              
                              <div className="flex flex-wrap gap-3">
                                <button
                                  onClick={() => handleTrackOrder(order)}
                                  className="text-xs font-bold text-[#b59a5c] uppercase tracking-wider hover:text-black flex items-center gap-1"
                                >
                                  <Truck size={14} /> Track
                                </button>
                                <a
                                  href={`/api/orders/invoice?orderId=${order.id}`}
                                  className="text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-black flex items-center gap-1"
                                >
                                  <FileText size={14} /> Invoice
                                </a>
                                {(order.status === 'completed' || order.status === 'processing') && (
                                  <Link
                                    href={`/account/return/${order.id}`}
                                    className="text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-red-500 flex items-center gap-1"
                                  >
                                    <RefreshCw size={14} /> Request Return
                                  </Link>
                                )}
                                {isCancellable(order.status) && (
                                  <button
                                    onClick={() => handleCancel(order)}
                                    disabled={cancellingId === order.id}
                                    className="text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-red-600 flex items-center gap-1 disabled:opacity-50"
                                  >
                                    {cancellingId === order.id
                                      ? <Loader2 size={14} className="animate-spin" />
                                      : <RefreshCw size={14} />}
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'profile' && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <h2 className="text-xl font-serif text-gray-900 border-b-2 border-[#b59a5c] pb-1 mb-8 inline-block">Profile Details</h2>
                    {customer ? (
                      <div className="max-w-md space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">First Name</label>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-gray-800">{customer.firstName}</div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Last Name</label>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-gray-800">{customer.lastName}</div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded text-gray-800">{customer.email}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-md space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded text-gray-800 break-all">{sessionEmail}</div>
                        </div>
                        <p className="text-sm text-gray-500">
                          You&apos;re signed in with a one-time email code. Create a password-protected account to save your addresses and manage your profile.
                        </p>
                        <Link
                          href="/register"
                          className="inline-block bg-black text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#b59a5c] transition-colors rounded"
                        >
                          Create an Account
                        </Link>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'track' && (
                  <motion.div
                    key="track"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-xl font-serif text-gray-900 border-b-2 border-[#b59a5c] pb-1 inline-block">Track Package</h2>
                    </div>

                    {!trackingOrder ? (
                      <div className="text-center py-16 bg-gray-50 border border-gray-100 rounded-xl">
                        <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="font-serif text-lg text-gray-800 mb-2">No active orders to track</h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">Place an order first to track its journey to you.</p>
                        <button
                          onClick={() => setActiveTab('orders')}
                          className="bg-[#1a1a1a] text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#b59a5c] transition-colors rounded"
                        >
                          View Order History
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Selector for other orders if needed */}
                        {orders.length > 1 && (
                          <div className="mb-6 flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <span className="text-sm font-medium text-gray-600">Currently Tracking:</span>
                            <select 
                              className="bg-white border border-gray-200 text-sm font-bold text-gray-900 rounded p-2 focus:ring-[#b59a5c] focus:outline-none"
                              value={trackingOrder.id}
                              onChange={(e) => {
                                const selected = orders.find(o => o.id === Number(e.target.value));
                                if (selected) handleTrackOrder(selected);
                              }}
                            >
                              {orders.map(o => (
                                <option key={o.id} value={o.id}>Order #{o.number} - {new Date(o.dateCreated).toLocaleDateString()}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[300px]">
                          {isSearchingTracking ? (
                            <div className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center p-8">
                              <div className="w-full max-w-sm px-8 relative h-20 flex items-center">
                                {/* Road line */}
                                <div className="absolute top-1/2 left-8 right-8 h-[2px] bg-gray-200 -translate-y-1/2 rounded-full overflow-hidden">
                                  <motion.div 
                                    className="w-full h-full bg-[#b59a5c]" 
                                    initial={{ scaleX: 0, transformOrigin: 'left' }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ duration: 2.5, ease: "linear" }}
                                  />
                                </div>
                                
                                {/* Moving truck */}
                                <motion.div
                                  className="absolute z-10 text-[#1a1a1a] drop-shadow-lg"
                                  initial={{ left: "2rem", x: "-50%" }}
                                  animate={{ left: "calc(100% - 2rem)", x: "-50%" }}
                                  transition={{
                                    duration: 2.5,
                                    ease: "easeInOut",
                                  }}
                                >
                                  <Truck size={40} className="fill-white" strokeWidth={1.5} />
                                </motion.div>
                              </div>
                              <p className="mt-4 font-serif text-lg text-gray-800 animate-pulse">Contacting logistics partner...</p>
                            </div>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="h-full"
                            >
                              <div className="bg-[#fbfcfa] border-b border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                  <p className="text-sm text-gray-500 mb-1">Order #{trackingOrder.number}</p>
                                  <h2 className="text-2xl font-serif text-gray-900 flex items-center gap-2 capitalize">
                                    {liveTracking && !liveTracking.fallback ? liveTracking.status : trackingOrder.status}
                                    {(trackingOrder.status === "completed" || (liveTracking?.status || "").toLowerCase() === "delivered") && <CheckCircle2 className="text-green-500" size={24} />}
                                  </h2>
                                  {liveTracking?.awb && (
                                    <p className="text-xs text-gray-400 mt-1">AWB: {liveTracking.awb}</p>
                                  )}
                                </div>
                                <div className="bg-white px-5 py-3 rounded-lg border border-gray-100 shadow-sm text-center md:text-right">
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Expected Delivery</p>
                                  <p className="font-bold text-[#b59a5c] text-lg">
                                    {liveTracking?.etaDate
                                      ? new Date(liveTracking.etaDate).toLocaleDateString("en-IN")
                                      : "Calculating…"}
                                  </p>
                                </div>
                              </div>

                              <div className="p-6 md:p-8">
                                {/* Progress Tracker */}
                                <div className="relative max-w-2xl mx-auto mb-8 mt-4">
                                  <div className="absolute top-5 left-8 right-8 h-1 bg-gray-100 rounded-full">
                                    <div 
                                      className="h-full bg-[#b59a5c] rounded-full transition-all duration-1000"
                                      style={{ width: `${((getStatusStep(trackingOrder.status) - 1) / 3) * 100}%` }}
                                    />
                                  </div>
                                  
                                  <div className="relative flex justify-between">
                                    {[
                                      { icon: Package, label: "Order Placed", step: 1 },
                                      { icon: Truck, label: "Shipped", step: 2 },
                                      { icon: MapPin, label: "Out for Delivery", step: 3 },
                                      { icon: CheckCircle2, label: "Delivered", step: 4 }
                                    ].map((s) => {
                                      const isActive = getStatusStep(trackingOrder.status) >= s.step;
                                      const Icon = s.icon;
                                      return (
                                        <div key={s.label} className="flex flex-col items-center">
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 transition-colors duration-500 ${
                                            isActive ? "bg-[#b59a5c] text-white" : "bg-gray-200 text-gray-400"
                                          }`}>
                                            <Icon size={18} />
                                          </div>
                                          <p className={`mt-3 text-xs font-bold uppercase tracking-wider text-center w-20 leading-tight ${
                                            isActive ? "text-gray-900" : "text-gray-400"
                                          }`}>
                                            {s.label}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {liveTracking && !liveTracking.fallback && liveTracking.checkpoints.length > 0 && (
                                  <div className="mt-4 border-t border-gray-100 pt-6">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Shipment Activity</h4>
                                    <ol className="space-y-4">
                                      {liveTracking.checkpoints.map((c, i) => (
                                        <li key={i} className="flex gap-3">
                                          <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? "bg-[#b59a5c]" : "bg-gray-300"}`} />
                                          <div>
                                            <p className="text-sm text-gray-800">{c.activity}</p>
                                            <p className="text-xs text-gray-400">
                                              {c.location ? `${c.location} · ` : ""}{c.date}
                                            </p>
                                          </div>
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                )}

                                {liveTracking?.fallback && (
                                  <p className="mt-4 text-xs text-gray-400 text-center">
                                    Live courier tracking will appear here once your order ships.
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                 {activeTab === 'returns' && (
                  <motion.div
                    key="returns"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-xl font-serif text-gray-900 border-b-2 border-[#b59a5c] pb-1 inline-block">Returns & Refunds</h2>
                    </div>

                    <div className="bg-[#fcf8e8] border border-[#f0e6c8] p-4 rounded-lg mb-8">
                      <h3 className="font-bold text-[#8a6d3b] mb-1">Our Return Policy</h3>
                      <p className="text-sm text-[#8a6d3b]/80">You can request a return within 7 days of delivery. The product must be unused and in original packaging.</p>
                    </div>

                    <div className="text-center py-16 bg-gray-50 border border-gray-100 rounded-xl">
                        <RefreshCw className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="font-serif text-lg text-gray-800 mb-2">No Active Returns</h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">If you have recently submitted a return ticket, its status will be displayed here.</p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'support' && (
                  <motion.div
                    key="support"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <h2 className="text-xl font-serif text-gray-900 border-b-2 border-[#b59a5c] pb-1 mb-8 inline-block">Support Helpdesk</h2>
                    <div className="space-y-4">
                      <Link href="/contact-us" className="block p-6 border border-gray-200 rounded-xl hover:border-[#b59a5c] transition-colors group">
                        <h3 className="font-bold text-gray-900 group-hover:text-[#b59a5c] mb-2 flex items-center justify-between">
                          Contact Us
                          <ChevronRight size={16} />
                        </h3>
                        <p className="text-sm text-gray-500">Reach out directly via email or phone.</p>
                      </Link>
                      <div className="block p-6 border border-gray-200 rounded-xl hover:border-[#b59a5c] transition-colors group cursor-pointer">
                        <h3 className="font-bold text-gray-900 group-hover:text-[#b59a5c] mb-2 flex items-center justify-between">
                          FAQ
                          <ChevronRight size={16} />
                        </h3>
                        <p className="text-sm text-gray-500">Read our frequently asked questions about shipping, care, and quality.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
