'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  Search, 
  ExternalLink, 
  Plus, 
  ChevronDown, 
  ShoppingBag, 
  ArrowLeft,
  Filter,
  DollarSign,
  TrendingUp,
  Store
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface OrderItem {
  id?: string;
  title: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  origin_village?: string;
}

interface OrderRecord {
  id?: string;
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
  total: number;
  status: 'confirmed' | 'packing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  payment_method?: string;
  upi_ref?: string;
  producer_upi?: string;
  created_at?: string;
  order_items?: OrderItem[];
  items?: OrderItem[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [filteredStatus, setFilteredStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Load orders from Supabase + localStorage
  useEffect(() => {
    async function loadOrders() {
      setLoading(true);

      let loadedOrders: OrderRecord[] = [];

      // 1. Try Supabase
      try {
        const isSupabaseConfigured =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project-id');

        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            loadedOrders = data as OrderRecord[];
          }
        }
      } catch (e) {
        console.warn('Supabase fetch skipped:', e);
      }

      // 2. Supplement with local orders if any
      try {
        const stored = localStorage.getItem('fromvillage_orders');
        if (stored) {
          const localParsed = JSON.parse(stored);
          const formattedLocal: OrderRecord[] = localParsed.map((o: any) => ({
            id: o.orderId,
            order_number: o.orderId || o.order_number,
            customer_name: o.name || 'Village Customer',
            customer_email: o.email || 'customer@fromvillage.org',
            delivery_address: o.address || { street: '1428 Mission St', city: 'San Francisco', state: 'CA', zip: '94107' },
            delivery_timing: o.timing || 'Today, 2:00 PM – 4:00 PM',
            subtotal: o.subtotal || o.total || 0,
            total: o.total || 0,
            status: o.status || 'confirmed',
            payment_method: o.payment_method || 'card',
            upi_ref: o.upi_ref,
            producer_upi: o.producer_upi,
            created_at: o.createdAt || new Date().toISOString(),
            items: o.items || [],
          }));

          // Merge without duplicate order_numbers
          const existingIds = new Set(loadedOrders.map((o) => o.order_number));
          for (const local of formattedLocal) {
            if (!existingIds.has(local.order_number)) {
              loadedOrders.push(local);
            }
          }
        }
      } catch {
        // ignore storage error
      }

      setOrders(loadedOrders);
      setLoading(false);
    }

    loadOrders();
  }, []);

  // Update order status
  const handleUpdateStatus = async (orderNumber: string, newStatus: OrderRecord['status']) => {
    setUpdatingId(orderNumber);

    // 1. Update in local state
    setOrders((prev) =>
      prev.map((o) => (o.order_number === orderNumber ? { ...o, status: newStatus } : o))
    );

    // 2. Update in Supabase
    try {
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project-id');

      if (isSupabaseConfigured) {
        await supabase
          .from('orders')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('order_number', orderNumber);
      }
    } catch {
      // ignore
    }

    // 3. Update in localStorage cache
    try {
      const stored = localStorage.getItem('fromvillage_orders');
      if (stored) {
        const list = JSON.parse(stored);
        const updatedList = list.map((item: any) =>
          (item.orderId === orderNumber || item.order_number === orderNumber)
            ? { ...item, status: newStatus }
            : item
        );
        localStorage.setItem('fromvillage_orders', JSON.stringify(updatedList));
      }
    } catch {
      // ignore
    }

    setUpdatingId(null);
  };

  // Metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const activePacking = orders.filter((o) => o.status === 'confirmed' || o.status === 'packing').length;
  const inTransit = orders.filter((o) => o.status === 'out_for_delivery').length;
  const completed = orders.filter((o) => o.status === 'delivered').length;

  const filteredOrders = orders.filter((ord) => {
    const matchesStatus = filteredStatus === 'all' || ord.status === filteredStatus;
    const matchesSearch =
      ord.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.delivery_address?.city?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#fbfbfb] text-[#1a1a1a] font-sans antialiased selection:bg-[#205b3d] selection:text-white pb-24">
      {/* Admin Top Navigation */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition">
              <img
                src="/images/logo.png"
                alt="FromVillage"
                className="h-7 sm:h-8 w-auto object-contain"
              />
            </Link>
            <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider text-[#205b3d] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              Grower & Admin Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/products"
              className="text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition flex items-center gap-1.5"
            >
              <Store size={14} />
              <span>Catalog & Stock</span>
            </Link>
            <Link
              href="/admin/add-product"
              className="text-xs font-semibold text-white bg-[#205b3d] hover:bg-[#16442c] px-3.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add Harvest Item</span>
            </Link>
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1.5 transition"
            >
              Storefront
            </Link>
          </div>
        </div>
      </header>

      {/* Main Admin Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Title Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Order Fulfillment Operations
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage live morning harvest packing, dispatch couriers, and track village delivery status.
          </p>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
              <span>Total Revenue</span>
              <DollarSign size={15} className="text-[#205b3d]" />
            </div>
            <span className="text-lg sm:text-2xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">82% direct to growers</span>
          </div>

          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
              <span>Awaiting Packing</span>
              <Package size={15} className="text-amber-600" />
            </div>
            <span className="text-lg sm:text-2xl font-bold text-gray-900">{activePacking}</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Pending morning harvest</span>
          </div>

          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
              <span>EV In Transit</span>
              <Truck size={15} className="text-blue-600" />
            </div>
            <span className="text-lg sm:text-2xl font-bold text-gray-900">{inTransit}</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Active courier routes</span>
          </div>

          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
              <span>Completed</span>
              <CheckCircle size={15} className="text-emerald-600" />
            </div>
            <span className="text-lg sm:text-2xl font-bold text-gray-900">{completed}</span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">Delivered fresh</span>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="bg-white border border-gray-200/80 rounded-xl p-3 sm:p-4 mb-5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Status Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: `All (${orders.length})` },
              { id: 'confirmed', label: 'Confirmed' },
              { id: 'packing', label: 'Packing' },
              { id: 'out_for_delivery', label: 'In Transit' },
              { id: 'delivered', label: 'Delivered' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilteredStatus(tab.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                  filteredStatus === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order # or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#205b3d] transition"
            />
          </div>
        </div>

        {/* Orders Table / Cards */}
        {loading ? (
          <div className="bg-white border border-gray-200/80 rounded-xl p-12 text-center text-xs text-gray-400 animate-pulse">
            Loading fulfillment orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <Package size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs font-semibold text-gray-700">No orders found</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {searchQuery || filteredStatus !== 'all'
                ? 'Try adjusting your status filter or search query.'
                : 'Orders placed on the storefront will appear here instantly.'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200/80 rounded-xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Order Details</th>
                    <th className="py-3 px-4">Customer & Location</th>
                    <th className="py-3 px-4">Delivery Window</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Fulfillment Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((ord) => {
                    const itemsCount = (ord.order_items || ord.items || []).length;
                    return (
                      <tr key={ord.order_number} className="hover:bg-gray-50/60 transition">
                        {/* Order Details */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-900 font-mono block">
                            {ord.order_number}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {itemsCount} item{itemsCount === 1 ? '' : 's'} · {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Today'}
                          </span>
                        </td>

                        {/* Customer & Location */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-gray-900 block truncate max-w-[140px]">
                            {ord.customer_name || 'Village Member'}
                          </span>
                          <span className="text-[10px] text-gray-500 truncate block max-w-[160px]">
                            {ord.delivery_address?.street || '1428 Mission St'}, {ord.delivery_address?.city || 'SF'}
                          </span>
                        </td>

                        {/* Delivery Window */}
                        <td className="py-3.5 px-4 text-gray-700">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">{ord.delivery_timing}</span>
                          </div>
                        </td>

                        {/* Total & Payment */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-900 block">${ord.total.toFixed(2)}</span>
                          {ord.payment_method === 'upi' ? (
                            <span className="inline-block text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded mt-0.5" title={ord.upi_ref ? `UTR: ${ord.upi_ref}` : 'Direct UPI'}>
                              UPI {ord.upi_ref ? `· ${ord.upi_ref}` : ''}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 capitalize block">{ord.payment_method || 'card'}</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              ord.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'out_for_delivery'
                                ? 'bg-blue-100 text-blue-800'
                                : ord.status === 'packing'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {ord.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Fulfillment Action Dropdown / Button */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={ord.status}
                              disabled={updatingId === ord.order_number}
                              onChange={(e) =>
                                handleUpdateStatus(ord.order_number, e.target.value as any)
                              }
                              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-[#205b3d] cursor-pointer"
                            >
                              <option value="confirmed">Confirmed</option>
                              <option value="packing">Packing</option>
                              <option value="out_for_delivery">Out for Delivery</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>

                            <Link
                              href={`/orders?id=${ord.order_number}`}
                              target="_blank"
                              title="Customer Live Tracking View"
                              className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg border border-gray-200 transition"
                            >
                              <ExternalLink size={13} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
