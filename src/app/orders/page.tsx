'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  ShoppingBag, 
  Clock, 
  MapPin, 
  Truck, 
  PackageCheck, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ArrowLeft,
  Calendar,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface OrderItem {
  id?: string;
  title: string;
  quantity: number;
  unit_price?: number;
  price?: number;
  total_price?: number;
  image_url?: string;
  origin_village?: string;
}

interface OrderRecord {
  order_number: string;
  customer_name?: string;
  customer_email?: string;
  delivery_address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  delivery_timing: string;
  subtotal: number;
  delivery_fee?: number;
  tax?: number;
  discount?: number;
  total: number;
  status: 'confirmed' | 'packing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  payment_method?: string;
  payment_status?: string;
  upi_ref?: string;
  producer_upi?: string;
  created_at?: string;
  order_items?: OrderItem[];
  items?: OrderItem[];
}

const STATUS_STEPS = [
  { id: 'confirmed', label: 'Order Received', desc: 'Confirmed with growers' },
  { id: 'packing', label: 'Harvest & Pack', desc: 'Fresh from village farms' },
  { id: 'out_for_delivery', label: 'EV Transit', desc: 'Dispatched on cold courier' },
  { id: 'delivered', label: 'Delivered', desc: 'Fresh at your doorstep' },
];

function OrderTrackerContent() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get('id');

  const [searchId, setSearchId] = useState(queryId || '');
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const [pastOrders, setPastOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load order details whenever query or search changes
  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setErrorMsg(null);

      const targetId = queryId || searchId;

      // 1. Check local storage for recent orders
      let localList: OrderRecord[] = [];
      try {
        const stored = localStorage.getItem('fromvillage_orders');
        if (stored) {
          const parsed = JSON.parse(stored);
          localList = parsed.map((o: any) => ({
            order_number: o.orderId || o.order_number,
            customer_name: o.name || 'Village Member',
            delivery_address: o.address || { street: '1428 Mission St', city: 'San Francisco', state: 'CA', zip: '94107' },
            delivery_timing: o.timing || 'Today, 2:00 PM – 4:00 PM',
            subtotal: o.subtotal || o.total || 0,
            delivery_fee: 0,
            tax: 0,
            discount: 0,
            total: o.total || 0,
            status: o.status || 'confirmed',
            payment_method: o.payment_method || 'card',
            payment_status: o.payment_status || 'paid',
            upi_ref: o.upi_ref,
            producer_upi: o.producer_upi,
            created_at: o.createdAt || new Date().toISOString(),
            items: o.items || [],
          }));
        }
      } catch {
        // ignore storage error
      }

      // 2. Fetch authenticated user's orders from Supabase
      let dbOrders: OrderRecord[] = [];
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project-id');

      if (isSupabaseConfigured) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data, error } = await supabase
              .from('orders')
              .select('*, order_items(*)')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (!error && data && data.length > 0) {
              dbOrders = data as OrderRecord[];
            }
          }
        } catch (e) {
          console.warn('Could not fetch user orders from Supabase:', e);
        }
      }

      // Merge Supabase orders and local cache without duplicate order numbers
      const mergedMap = new Map<string, OrderRecord>();
      for (const ord of dbOrders) {
        mergedMap.set(ord.order_number.toUpperCase(), ord);
      }
      for (const ord of localList) {
        const key = ord.order_number.toUpperCase();
        if (!mergedMap.has(key)) {
          mergedMap.set(key, ord);
        }
      }
      const allOrders = Array.from(mergedMap.values());
      setPastOrders(allOrders);

      // 3. If target ID provided, lookup in Supabase or merged list
      if (targetId) {
        let found: OrderRecord | null = null;

        if (isSupabaseConfigured) {
          try {
            const { data, error } = await supabase
              .from('orders')
              .select('*, order_items(*)')
              .eq('order_number', targetId.trim().toUpperCase())
              .maybeSingle();

            if (!error && data) {
              found = data as OrderRecord;
            }
          } catch {
            // ignore
          }
        }

        if (!found) {
          found = allOrders.find(
            (o) => o.order_number.toUpperCase() === targetId.trim().toUpperCase()
          ) || null;
        }

        if (found) {
          setActiveOrder(found);
        } else {
          setActiveOrder(null);
          if (targetId.trim()) {
            setErrorMsg(`No order found matching "${targetId}". Please verify your order ID.`);
          }
        }
      } else if (allOrders.length > 0) {
        // Default to most recent order
        setActiveOrder(allOrders[0]);
      } else {
        setActiveOrder(null);
      }

      setLoading(false);
    }

    fetchOrders();
  }, [queryId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    window.location.href = `/orders?id=${encodeURIComponent(searchId.trim().toUpperCase())}`;
  };

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 0;
      case 'packing':
        return 1;
      case 'out_for_delivery':
        return 2;
      case 'delivered':
        return 3;
      default:
        return 0;
    }
  };

  const currentStepIndex = activeOrder ? getStepIndex(activeOrder.status) : 0;
  const orderItemsList = activeOrder?.order_items || activeOrder?.items || [];

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#1a1a1a] font-sans antialiased selection:bg-[#205b3d] selection:text-white pb-20">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition">
              <img
                src="/images/logo.png"
                alt="FromVillage"
                className="h-7 sm:h-8 w-auto object-contain"
              />
            </Link>
            <span className="hidden sm:inline-block text-xs text-gray-400 font-medium border-l border-gray-200 pl-4">
              Live Harvest Order Tracking
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 transition"
            >
              Back to Store
            </Link>
          </div>
        </div>
      </header>

      {/* Main Tracker Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        {/* Order ID Lookup Bar */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 mb-6 sm:mb-8 shadow-xs">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Enter Order ID (e.g. FV-849201)..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 focus:border-[#205b3d] rounded-xl outline-none transition font-mono uppercase"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#205b3d] hover:bg-[#16442c] active:scale-95 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Track Order
            </button>
          </form>

          {errorMsg && (
            <div className="mt-3 flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200/80 p-10 text-center animate-pulse">
            <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3" />
            <div className="h-4 bg-gray-100 rounded w-48 mx-auto mb-2" />
            <div className="h-3 bg-gray-100 rounded w-64 mx-auto" />
          </div>
        ) : activeOrder ? (
          <div className="space-y-6">
            
            {/* Top Status Card */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#205b3d] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                      Order {activeOrder.order_number}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {activeOrder.created_at ? new Date(activeOrder.created_at).toLocaleDateString() : 'Today'}
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">
                    {activeOrder.status === 'delivered'
                      ? 'Harvest Box Delivered!'
                      : activeOrder.status === 'out_for_delivery'
                      ? 'Out for Eco Delivery'
                      : activeOrder.status === 'packing'
                      ? 'Packing Fresh at Village Farm'
                      : 'Harvest Order Confirmed'}
                  </h1>
                </div>

                <div className="bg-gray-50 border border-gray-200/70 px-4 py-2.5 rounded-xl flex items-center gap-3">
                  <Clock size={18} className="text-[#205b3d]" />
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium uppercase">Arrival Slot</span>
                    <span className="text-xs font-bold text-gray-900">{activeOrder.delivery_timing}</span>
                  </div>
                </div>
              </div>

              {/* Progress Stepper */}
              <div className="py-8">
                <div className="relative flex items-center justify-between max-w-2xl mx-auto">
                  {/* Connecting Line */}
                  <div className="absolute left-6 right-6 top-4 h-0.5 bg-gray-200 -z-0" />
                  <div
                    className="absolute left-6 top-4 h-0.5 bg-[#205b3d] transition-all duration-500 -z-0"
                    style={{
                      width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%`,
                    }}
                  />

                  {STATUS_STEPS.map((step, idx) => {
                    const isDone = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;

                    return (
                      <div key={step.id} className="relative z-10 flex flex-col items-center text-center px-1">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                            isDone
                              ? 'bg-[#205b3d] text-white'
                              : isCurrent
                              ? 'bg-[#205b3d] text-white ring-4 ring-emerald-100 scale-110'
                              : 'bg-white border-2 border-gray-200 text-gray-400'
                          }`}
                        >
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <span className={`text-[11px] sm:text-xs font-semibold mt-2.5 block ${isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>
                          {step.label}
                        </span>
                        <span className="text-[10px] text-gray-400 hidden sm:block max-w-[100px] mt-0.5 leading-tight">
                          {step.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Courier Delivery Highlight Banner */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-start gap-3 text-xs text-gray-700">
                <Truck size={16} className="text-[#205b3d] mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Regenerative Cold-Chain:</strong> Your produce is packed in 100% compostable mycelium insulation and transported via zero-emission vehicle straight from the growers.
                </p>
              </div>
            </div>

            {/* Split Order Info & Items */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Delivery & Payment Info */}
              <div className="md:col-span-1 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#205b3d]" />
                    <span>Delivery Location</span>
                  </h3>
                  <div className="text-xs text-gray-600 leading-relaxed">
                    <p className="font-semibold text-gray-900">{activeOrder.customer_name || 'Village Member'}</p>
                    <p>{activeOrder.delivery_address?.street || '1428 Mission St, Apt 4B'}</p>
                    <p>
                      {activeOrder.delivery_address?.city || 'San Francisco'}, {activeOrder.delivery_address?.state || 'CA'} {activeOrder.delivery_address?.zip || '94107'}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-[#205b3d]" />
                    <span>Payment & Invoicing</span>
                  </h3>
                  <div className="text-xs text-gray-600 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Method</span>
                      <span className="font-medium">
                        {activeOrder.payment_method === 'upi' ? 'Direct UPI' : (activeOrder.payment_method || 'Credit Card')}
                      </span>
                    </div>
                    {activeOrder.producer_upi && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-gray-400">Grower VPA</span>
                        <span className="font-mono text-[11px] text-[#205b3d] font-semibold">{activeOrder.producer_upi}</span>
                      </div>
                    )}
                    {activeOrder.upi_ref && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-gray-400">UTR Ref</span>
                        <span className="font-mono text-[11px] text-gray-700">{activeOrder.upi_ref}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status</span>
                      <span className="font-bold text-emerald-700 capitalize">
                        {activeOrder.payment_status === 'upi_submitted' ? 'Submitted (Direct Payout)' : (activeOrder.payment_status || 'Paid')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List & Receipt */}
              <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-xs">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Harvest Items ({orderItemsList.length})</span>
                  <span className="text-[11px] text-gray-400 normal-case">Direct from village farms</span>
                </h3>

                <div className="divide-y divide-gray-100">
                  {orderItemsList.map((item, i) => {
                    const price = item.unit_price ?? item.price ?? 0;
                    return (
                      <div key={i} className="py-3 flex items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                              <ShoppingBag size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-gray-900 block truncate">{item.title}</span>
                            <span className="text-[10px] text-gray-400 block">
                              {item.origin_village || 'Village Sourced'} · {item.quantity} × ${price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-gray-900 flex-shrink-0">
                          ${(price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Receipt Totals */}
                <div className="border-t border-gray-100 pt-4 mt-4 space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${activeOrder.subtotal?.toFixed(2) || activeOrder.total?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fresh Delivery</span>
                    <span>{activeOrder.delivery_fee ? `$${activeOrder.delivery_fee.toFixed(2)}` : 'FREE'}</span>
                  </div>
                  {activeOrder.discount ? (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Harvest Voucher</span>
                      <span>-${activeOrder.discount.toFixed(2)}</span>
                    </div>
                  ) : null}
                  <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-bold text-gray-900">
                    <span>Total Paid</span>
                    <span className="text-[#205b3d]">${activeOrder.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center">
            <ShoppingBag size={32} className="mx-auto text-gray-300 mb-3" />
            <h2 className="text-base font-bold text-gray-900">No active harvest orders found</h2>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              You haven't placed an order yet, or the order ID wasn't found. Check out our fresh village harvest to get started!
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#205b3d] text-white text-xs font-semibold rounded-xl hover:bg-[#16442c] transition"
            >
              <span>Explore Marketplace</span>
            </Link>
          </div>
        )}

        {/* Past Orders History Drawer (if any exist) */}
        {pastOrders.length > 1 && (
          <div className="mt-10 bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-xs">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">
              Your Past Harvest Orders
            </h3>
            <div className="divide-y divide-gray-100">
              {pastOrders.map((ord) => (
                <div key={ord.order_number} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-gray-900 font-mono block">{ord.order_number}</span>
                    <span className="text-[10px] text-gray-400">{ord.delivery_timing} · ${ord.total.toFixed(2)}</span>
                  </div>
                  <Link
                    href={`/orders?id=${ord.order_number}`}
                    className="flex items-center gap-1 text-[#205b3d] hover:underline font-semibold text-xs"
                  >
                    <span>View Status</span>
                    <ChevronRight size={13} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function OrdersTrackingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fafaf9] p-8 text-center text-xs text-gray-400">Loading order tracker...</div>}>
      <OrderTrackerContent />
    </Suspense>
  );
}
