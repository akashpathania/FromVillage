'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Trash2, 
  Plus, 
  Minus, 
  Truck, 
  ShieldCheck, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Leaf, 
  Info,
  MapPin,
  ShoppingBag,
  CreditCard,
  Lock,
  PackageCheck,
  Check,
  Clock,
  Sparkles
} from 'lucide-react';
import { useCartStore, CartItem } from '@/lib/cartStore';
import { supabase } from '@/lib/supabaseClient';

export default function CartAndDeliveryPage() {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCartStore();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherApplied, setVoucherApplied] = useState(false);
  const [deliveryTiming, setDeliveryTiming] = useState<'today-slot' | 'tomorrow-slot'>('today-slot');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay' | 'cod' | 'upi'>('card');
  const [upiRef, setUpiRef] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Address state
  const [address, setAddress] = useState({
    street: '1428 Mission St, Apt 4B',
    city: 'San Francisco',
    state: 'CA',
    zip: '94107',
  });

  // Card details state
  const [cardDetails, setCardDetails] = useState({
    name: 'Jane Doe',
    number: '•••• •••• •••• 4242',
    expiry: '08/28',
    cvc: '742',
  });

  // Confirmed order snapshot
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderId: string;
    items: CartItem[];
    subtotal: number;
    total: number;
    timing: string;
    date: string;
    paymentMethod?: string;
    upiRef?: string;
    producerUpi?: string;
  } | null>(null);

  const items = cart;
  const primaryProducerUpi = items.find((i) => i.producer_upi)?.producer_upi || 'fromvillage@upi';
  const primaryProducerName = items.find((i) => i.farm || i.origin_village)?.farm || items.find((i) => i.origin_village)?.origin_village || 'FromVillage Purveyor';

  const itemsSubtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalItemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const discountAmount = voucherApplied ? itemsSubtotal * 0.10 : 0;
  const freshDeliveryFee = items.length === 0 ? 0 : itemsSubtotal >= 25 ? 0 : 4.99;
  const ecoPackagingFee = items.length === 0 ? 0 : 1.50;
  const estimatedTax = (itemsSubtotal - discountAmount) * 0.085;
  const estimatedTotal = items.length === 0 ? 0 : Math.max(0, itemsSubtotal - discountAmount + freshDeliveryFee + ecoPackagingFee + estimatedTax);

  const handleApplyVoucher = () => {
    if (voucherCode.trim().toUpperCase() === 'HARVEST10') {
      setVoucherApplied(true);
    } else if (voucherCode.trim().length > 0) {
      alert("Try coupon code 'HARVEST10' for 10% off!");
    }
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    const orderId = `FV-${Math.floor(100000 + Math.random() * 900000)}`;
    const timingStr = deliveryTiming === 'today-slot' ? 'Today, 2:00 PM – 4:00 PM' : 'Tomorrow Morning (8:00 AM – 10:00 AM)';
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    try {
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project-id');

      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: orderData } = await supabase
          .from('orders')
          .insert([
            {
              order_number: orderId,
              user_id: user?.id || null,
              customer_name: cardDetails.name || 'Village Customer',
              customer_email: user?.email || 'customer@fromvillage.org',
              delivery_address: address,
              delivery_timing: timingStr,
              subtotal: itemsSubtotal,
              delivery_fee: freshDeliveryFee,
              tax: estimatedTax,
              discount: discountAmount,
              total: estimatedTotal,
              status: 'confirmed',
              payment_method: paymentMethod,
              payment_status: paymentMethod === 'upi' ? 'upi_submitted' : 'paid',
              upi_ref: paymentMethod === 'upi' ? upiRef.trim() : null,
            },
          ])
          .select('id')
          .single();

        if (orderData?.id) {
          const itemsToInsert = items.map((i) => ({
            order_id: orderData.id,
            title: i.title,
            quantity: i.quantity,
            unit_price: i.price,
            total_price: i.price * i.quantity,
            image_url: i.image_url || null,
            origin_village: i.origin_village || i.farm || 'Village Sourced',
          }));
          await supabase.from('order_items').insert(itemsToInsert);
        }
      }
    } catch (e) {
      console.warn('Database order insert skipped or fallback:', e);
    }

    // Always cache in localStorage so instant tracking works even offline
    try {
      const stored = localStorage.getItem('fromvillage_orders');
      const ordersList = stored ? JSON.parse(stored) : [];
      ordersList.unshift({
        orderId,
        items: [...items],
        subtotal: itemsSubtotal,
        total: estimatedTotal,
        timing: timingStr,
        date: dateStr,
        address,
        status: 'confirmed',
        payment_method: paymentMethod,
        upi_ref: paymentMethod === 'upi' ? upiRef.trim() : null,
        producer_upi: primaryProducerUpi,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('fromvillage_orders', JSON.stringify(ordersList.slice(0, 20)));
    } catch {
      // ignore storage error
    }

    setConfirmedOrder({
      orderId,
      items: [...items],
      subtotal: itemsSubtotal,
      total: estimatedTotal,
      timing: timingStr,
      date: dateStr,
      paymentMethod,
      upiRef: upiRef.trim() || undefined,
      producerUpi: primaryProducerUpi,
    });
    clearCart();
    setIsProcessing(false);
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExpressCheckout = (method: 'apple_pay' | 'google_pay' | 'paypal') => {
    if (items.length === 0) return;
    setPaymentMethod(method === 'paypal' ? 'card' : method);
    handlePlaceOrder();
  };

  return (
    <div className="min-h-screen bg-[#fbfbfb] text-[#1a1a1a] font-sans antialiased selection:bg-[#205b3d] selection:text-white pb-24 sm:pb-12">
      {/* Top Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-8">
            <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition">
              <img
                src="/images/logo.png"
                alt="FromVillage"
                className="h-7 sm:h-8 w-auto object-contain"
              />
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-xs text-gray-500 font-medium">
              <Link href="/" className="hover:text-gray-900 transition">Market</Link>
              <Link href="/" className="hover:text-gray-900 transition">Categories</Link>
              <Link href="/" className="hover:text-gray-900 transition">Organic Deals</Link>
              <Link href="/" className="hover:text-gray-900 transition">Seasonal</Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 text-xs font-medium text-gray-700">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg text-gray-600 border border-gray-200/60">
              <MapPin size={13} className="text-[#205b3d]" />
              <span>Deliver to: <strong>{address.zip}</strong></span>
            </div>

            <Link
              href="/"
              className="flex items-center gap-1.5 text-white bg-[#205b3d] hover:bg-[#16442c] active:scale-95 py-1.5 px-2.5 sm:px-3 rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <ShoppingBag size={14} />
              <span>Cart ({totalItemCount})<span className="hidden xs:inline"> · ${itemsSubtotal.toFixed(2)}</span></span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        
        {/* Sleek Mobile & Desktop Step Progress Indicator */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 p-3 sm:p-5 mb-4 sm:mb-6 shadow-2xs">
          <div className="flex items-center justify-between gap-1 sm:gap-4">
            
            {/* Step 1 */}
            <button
              onClick={() => currentStep > 1 && setCurrentStep(1)}
              className={`flex items-center gap-2 sm:gap-3 text-left ${currentStep >= 1 ? 'opacity-100 cursor-pointer' : 'opacity-50'}`}
            >
              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs transition-colors flex-shrink-0 ${
                currentStep > 1 
                  ? 'bg-emerald-600 text-white' 
                  : currentStep === 1 
                  ? 'bg-[#174e33] text-white' 
                  : 'border border-gray-300 text-gray-600'
              }`}>
                {currentStep > 1 ? <Check size={13} /> : '1'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-gray-900 block leading-tight">Cart</span>
                <span className="text-[10px] text-gray-400 hidden sm:block">Review harvest items</span>
              </div>
            </button>

            <div className={`flex-1 h-[2px] mx-1 sm:mx-2 transition-colors ${currentStep >= 2 ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>

            {/* Step 2 */}
            <button
              onClick={() => currentStep === 3 && setCurrentStep(2)}
              className={`flex items-center gap-2 sm:gap-3 text-left ${currentStep >= 2 ? 'opacity-100 cursor-pointer' : 'opacity-50'}`}
            >
              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors flex-shrink-0 ${
                currentStep > 2 
                  ? 'bg-emerald-600 text-white' 
                  : currentStep === 2 
                  ? 'bg-[#174e33] text-white shadow-xs' 
                  : 'border border-gray-300 text-gray-600'
              }`}>
                {currentStep > 2 ? <Check size={13} /> : '2'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-gray-700 block leading-tight">Payment</span>
                <span className="text-[10px] text-gray-400 hidden sm:block">Encrypted billing</span>
              </div>
            </button>

            <div className={`flex-1 h-[2px] mx-1 sm:mx-2 transition-colors ${currentStep === 3 ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>

            {/* Step 3 */}
            <div className={`flex items-center gap-2 sm:gap-3 ${currentStep === 3 ? 'opacity-100' : 'opacity-50'}`}>
              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors flex-shrink-0 ${
                currentStep === 3 ? 'bg-[#174e33] text-white shadow-xs' : 'border border-gray-300 text-gray-600'
              }`}>
                {currentStep === 3 ? <Sparkles size={13} /> : '3'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-gray-700 block leading-tight">Order</span>
                <span className="text-[10px] text-gray-400 hidden sm:block">Receipt & dispatch</span>
              </div>
            </div>

          </div>
        </div>

        {/* Free Delivery Threshold Banner (Only on Steps 1 & 2) */}
        {currentStep < 3 && (
          <div className="bg-[#ebf8f1] border border-[#c3edd5] rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between mb-4 sm:mb-8 text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#185c39] min-w-0">
              <Truck size={15} className="text-[#185c39] flex-shrink-0" />
              <span className="truncate">
                {freshDeliveryFee === 0 
                  ? 'Farm-Direct Free Delivery unlocked!'
                  : `Add $${(25 - itemsSubtotal).toFixed(2)} more for Free Delivery`}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#d4f2e1] text-[#145332] px-2 py-0.5 rounded flex-shrink-0 ml-2">
              {freshDeliveryFee === 0 ? 'FREE' : '$25 MIN'}
            </span>
          </div>
        )}

        {/* ==================== STEP 1: CART & DELIVERY ==================== */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Left Column: Basket Items & Delivery Logistics */}
            <div className="lg:col-span-8 space-y-4 sm:space-y-6">
              
              {/* Basket Card */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-6 shadow-2xs">
                <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-gray-100 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-gray-900">Your Basket</h2>
                    <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                      {items.length} Varieties / {totalItemCount} Items
                    </span>
                  </div>
                  {items.length > 0 && (
                    <button 
                      onClick={clearCart}
                      className="text-xs text-gray-400 hover:text-rose-600 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span className="hidden sm:inline">Clear Basket</span>
                    </button>
                  )}
                </div>

                {/* Items List - Mobile Optimized */}
                {items.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-3">
                      <ShoppingBag size={22} />
                    </div>
                    <p className="text-gray-700 font-semibold text-sm">Your basket is empty</p>
                    <p className="text-gray-400 text-xs mt-1 mb-4">You have not added any harvest items to your basket yet.</p>
                    <Link
                      href="/"
                      className="px-4 py-2 bg-[#205b3d] text-white text-xs font-semibold rounded-lg hover:bg-[#16442c] transition flex items-center gap-1.5"
                    >
                      <ArrowLeft size={13} />
                      <span>Browse Harvest</span>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <div key={item.id} className="py-3.5 flex gap-3 sm:gap-4 items-center">
                        {/* Item Image */}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <ShoppingBag size={20} />
                            </div>
                          )}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#205b3d] block truncate">
                                {item.farm || item.origin_village || 'FROM VILLAGE'}
                              </span>
                              <h3 className="text-xs font-bold text-gray-900 truncate mt-0.5">{item.title}</h3>
                              <p className="text-[11px] text-gray-400 truncate">
                                {item.details || `${item.unit} · Direct`}
                              </p>
                            </div>
                            
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              className="text-gray-300 hover:text-rose-500 transition cursor-pointer p-1 -mr-1"
                              aria-label="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Quantity Stepper & Price Row */}
                          <div className="flex items-center justify-between mt-2.5 pt-1">
                            <div className="flex items-center gap-2 bg-[#f5f6f8] rounded-lg p-0.5 border border-gray-200/60">
                              <button 
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-white text-gray-600 hover:text-black flex items-center justify-center text-xs shadow-2xs cursor-pointer active:scale-95"
                                aria-label="Decrease quantity"
                              >
                                <Minus size={11} />
                              </button>
                              <span className="text-xs font-bold text-gray-900 min-w-[16px] text-center">
                                {item.quantity}
                              </span>
                              <button 
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-white text-gray-600 hover:text-black flex items-center justify-center text-xs shadow-2xs cursor-pointer active:scale-95"
                                aria-label="Increase quantity"
                              >
                                <Plus size={11} />
                              </button>
                            </div>

                            <div className="text-right">
                              <span className="text-xs sm:text-sm font-bold text-gray-900">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-gray-400 block sm:hidden">
                                (${item.price.toFixed(2)}/ea)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <Link
                    href="/"
                    className="text-xs text-[#205b3d] hover:underline font-semibold flex items-center gap-1"
                  >
                    <ArrowLeft size={13} />
                    <span>Browse more farm products</span>
                  </Link>
                </div>
              </div>

              {/* Delivery Logistics Box */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-[#205b3d]" />
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900">Delivery Logistics</h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active Fleet
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`p-3 sm:p-3.5 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                    deliveryTiming === 'today-slot' ? 'border-[#205b3d] bg-emerald-50/20 ring-1 ring-[#205b3d]' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="timing" 
                          checked={deliveryTiming === 'today-slot'} 
                          onChange={() => setDeliveryTiming('today-slot')}
                          className="text-[#205b3d] focus:ring-0" 
                        />
                        <span className="text-xs font-bold text-gray-900">Today, 2:00 PM – 4:00 PM</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1 pl-5">Packed straight from morning harvests</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-800">FREE</span>
                  </label>

                  <label className={`p-3 sm:p-3.5 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                    deliveryTiming === 'tomorrow-slot' ? 'border-[#205b3d] bg-emerald-50/20 ring-1 ring-[#205b3d]' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="timing" 
                          checked={deliveryTiming === 'tomorrow-slot'} 
                          onChange={() => setDeliveryTiming('tomorrow-slot')}
                          className="text-[#205b3d] focus:ring-0" 
                        />
                        <span className="text-xs font-bold text-gray-900">Tomorrow Morning (8–10 AM)</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1 pl-5">Pre-dawn country depot run</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-800">FREE</span>
                  </label>
                </div>
              </div>

            </div>

            {/* Right Column: Order Summary */}
            <div className="lg:col-span-4 space-y-4 sm:space-y-5">
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-6 shadow-2xs">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-3 sm:mb-4">Order Summary</h2>

                {/* Cost Rows */}
                <div className="space-y-2 text-xs text-gray-600 pb-3 sm:pb-4 border-b border-gray-100">
                  <div className="flex justify-between">
                    <span>Items Subtotal ({totalItemCount})</span>
                    <span className="font-semibold text-gray-900">${itemsSubtotal.toFixed(2)}</span>
                  </div>
                  {voucherApplied && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Farm Coupon (10% Off)</span>
                      <span className="font-semibold">-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      Fresh Delivery <Info size={12} className="text-gray-400" />
                    </span>
                    <span className="font-semibold text-emerald-700">
                      {freshDeliveryFee === 0 ? 'FREE' : `$${freshDeliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Eco Packaging (Tote)</span>
                    <span className="font-semibold text-gray-900">${ecoPackagingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Sales Tax (8.5%)</span>
                    <span className="font-semibold text-gray-900">${estimatedTax.toFixed(2)}</span>
                  </div>
                </div>

                {/* Total Estimated Cost */}
                <div className="py-3 sm:py-4 border-b border-gray-100">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-gray-900 block">Estimated Total</span>
                      <span className="text-[10px] text-gray-400">Including taxes & tote fee</span>
                    </div>
                    <span className="text-lg sm:text-xl font-black text-gray-900">
                      ${estimatedTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Voucher Input */}
                <div className="pt-3 sm:pt-4">
                  <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Voucher or Farm Pass
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="TRY 'HARVEST10'"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 font-mono uppercase"
                    />
                    <button 
                      onClick={handleApplyVoucher}
                      className="px-3 sm:px-3.5 py-2 bg-[#eef1f6] hover:bg-gray-200 active:scale-95 text-gray-800 text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                      {voucherApplied ? 'Applied ✓' : 'Apply'}
                    </button>
                  </div>
                </div>

                {/* Desktop Proceed to Payment CTA */}
                <button 
                  disabled={items.length === 0}
                  onClick={() => {
                    if (items.length === 0) return;
                    setCurrentStep(2);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`w-full mt-4 sm:mt-5 py-3 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition ${
                    items.length === 0
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-[#174e33] hover:bg-[#123e28] active:scale-[0.99] cursor-pointer'
                  }`}
                >
                  <span>Proceed to Payment</span>
                  <ArrowRight size={14} />
                </button>

                {/* Instant Express Checkout Buttons */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center mb-2.5">
                    Instant Express
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => handleExpressCheckout('apple_pay')}
                      className="py-2 bg-black text-white text-xs font-semibold rounded-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition cursor-pointer"
                    >
                      Pay
                    </button>
                    <button 
                      onClick={() => handleExpressCheckout('google_pay')}
                      className="py-2 bg-[#e8f0fe] text-[#1a73e8] text-xs font-semibold rounded-lg flex items-center justify-center border border-[#d2e3fc] hover:bg-blue-100 active:scale-95 transition cursor-pointer"
                    >
                      GPay
                    </button>
                    <button 
                      onClick={() => handleExpressCheckout('paypal')}
                      className="py-2 bg-[#ffc439] text-[#003087] text-xs font-bold rounded-lg flex items-center justify-center hover:bg-amber-400 active:scale-95 transition cursor-pointer"
                    >
                      PayPal
                    </button>
                  </div>
                </div>

                {/* Electric Fleet Offset Banner */}
                <div className="mt-4 sm:mt-5 p-3 rounded-xl bg-[#f2f7f4] border border-[#daf0e3] flex items-center gap-2.5">
                  <Leaf size={16} className="text-[#205b3d] flex-shrink-0" />
                  <div className="text-[11px] leading-tight">
                    <div className="flex justify-between font-bold text-gray-800">
                      <span>Regenerative Route</span>
                      <span className="text-[#205b3d]">100% Offset</span>
                    </div>
                    <p className="text-gray-500 text-[10px] mt-0.5">
                      Delivered with zero-tailpipe electric delivery fleet.
                    </p>
                  </div>
                </div>

              </div>

              {/* Trust & Guarantee Badges */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-2xs space-y-2.5 text-xs text-gray-600">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={16} className="text-[#205b3d] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-gray-900 block">Bank-Level 256-Bit SSL</span>
                    <span className="text-[11px] text-gray-400">Encrypted checkout & PCI Compliant</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle size={16} className="text-[#205b3d] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-gray-900 block">100% Farm Fresh Guarantee</span>
                    <span className="text-[11px] text-gray-400">1-click instant refund if dissatisfied</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==================== STEP 2: PAYMENT METHOD ==================== */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Left Column: Payment Options & Delivery Details */}
            <div className="lg:col-span-8 space-y-4 sm:space-y-6">
              
              {/* Payment Card Box */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-6 shadow-2xs">
                <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-gray-100 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-gray-900">Select Payment Method</h2>
                    <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">All transactions are end-to-end encrypted</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold">
                    <Lock size={12} />
                    <span>Secure 256-bit</span>
                  </div>
                </div>

                {/* Payment Options Radio/Tabs */}
                <div className="space-y-2.5 sm:space-y-3 mb-5 sm:mb-6">
                  {/* Credit Card Option */}
                  <label className={`p-3.5 sm:p-4 rounded-xl border flex items-start justify-between cursor-pointer transition ${
                    paymentMethod === 'card' ? 'border-[#205b3d] bg-emerald-50/15 ring-1 ring-[#205b3d]' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <input 
                        type="radio" 
                        name="payment" 
                        checked={paymentMethod === 'card'} 
                        onChange={() => setPaymentMethod('card')}
                        className="mt-0.5 text-[#205b3d]" 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">Credit or Debit Card</span>
                          <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">VISA/MC</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">Direct billing with 1-click farm receipt</p>
                      </div>
                    </div>
                    <CreditCard size={18} className="text-gray-400 flex-shrink-0" />
                  </label>

                  {/* Direct UPI Option */}
                  <label className={`p-3.5 sm:p-4 rounded-xl border flex items-start justify-between cursor-pointer transition ${
                    paymentMethod === 'upi' ? 'border-[#205b3d] bg-emerald-50/15 ring-1 ring-[#205b3d]' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <input 
                        type="radio" 
                        name="payment" 
                        checked={paymentMethod === 'upi'} 
                        onChange={() => setPaymentMethod('upi')}
                        className="mt-0.5 text-[#205b3d]" 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">Direct UPI / QR Code</span>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded uppercase">
                            Direct to Farmer
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Pay directly to {primaryProducerName}'s UPI account with GPay, PhonePe, Paytm, or BHIM
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-[#205b3d] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex-shrink-0">
                      <span>UPI</span>
                    </div>
                  </label>

                  {/* Digital Wallet Option */}
                  <label className={`p-3.5 sm:p-4 rounded-xl border flex items-start justify-between cursor-pointer transition ${
                    paymentMethod === 'apple_pay' ? 'border-[#205b3d] bg-emerald-50/15 ring-1 ring-[#205b3d]' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <input 
                        type="radio" 
                        name="payment" 
                        checked={paymentMethod === 'apple_pay'} 
                        onChange={() => setPaymentMethod('apple_pay')}
                        className="mt-0.5 text-[#205b3d]" 
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900">Apple Pay / Google Pay</span>
                        <p className="text-[11px] text-gray-400 mt-0.5">Biometric instant authorization</p>
                      </div>
                    </div>
                    <div className="flex gap-1 text-xs font-bold flex-shrink-0">
                      <span className="bg-black text-white px-2 py-0.5 rounded text-[11px]">Pay</span>
                      <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 text-[11px]">GPay</span>
                    </div>
                  </label>

                  {/* Cash on Delivery Option */}
                  <label className={`p-3.5 sm:p-4 rounded-xl border flex items-start justify-between cursor-pointer transition ${
                    paymentMethod === 'cod' ? 'border-[#205b3d] bg-emerald-50/15 ring-1 ring-[#205b3d]' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <input 
                        type="radio" 
                        name="payment" 
                        checked={paymentMethod === 'cod'} 
                        onChange={() => setPaymentMethod('cod')}
                        className="mt-0.5 text-[#205b3d]" 
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900">Pay on Harvest Arrival</span>
                        <p className="text-[11px] text-gray-400 mt-0.5">Tap or cash upon temperature verification</p>
                      </div>
                    </div>
                    <Truck size={18} className="text-gray-400 flex-shrink-0" />
                  </label>
                </div>

                {/* Direct UPI Box (if upi selected) */}
                {paymentMethod === 'upi' && (
                  <div className="bg-[#fbfcfa] rounded-xl p-4 sm:p-5 border border-emerald-200/90 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#205b3d] block">
                          DIRECT GROWER PAYOUT
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5">
                          Scan & Pay via Any UPI App
                        </h4>
                      </div>
                      <span className="text-xs font-bold text-[#205b3d] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        ${estimatedTotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      {/* Dynamic QR Code */}
                      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex flex-col items-center flex-shrink-0">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                            `upi://pay?pa=${primaryProducerUpi}&pn=${encodeURIComponent(primaryProducerName)}&am=${estimatedTotal.toFixed(2)}&cu=INR&tn=FromVillage`
                          )}`}
                          alt="Producer UPI Payment QR"
                          className="w-36 h-36 object-contain"
                        />
                        <span className="text-[9px] text-gray-400 mt-1 font-medium">Scan with GPay / PhonePe / Paytm</span>
                      </div>

                      {/* Details & App Launch */}
                      <div className="flex-1 w-full space-y-3">
                        <div className="p-3 bg-white rounded-xl border border-gray-200/80">
                          <span className="text-[10px] text-gray-400 font-semibold block uppercase">Producer / Farm UPI ID</span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs sm:text-sm font-mono font-bold text-gray-900 truncate">
                              {primaryProducerUpi}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(primaryProducerUpi);
                                setCopiedUpi(true);
                                setTimeout(() => setCopiedUpi(false), 2000);
                              }}
                              className="text-[11px] font-semibold text-[#205b3d] hover:underline flex items-center gap-1 cursor-pointer flex-shrink-0 ml-2"
                            >
                              {copiedUpi ? 'Copied ✓' : 'Copy UPI'}
                            </button>
                          </div>
                        </div>

                        {/* Open in UPI App */}
                        <a
                          href={`upi://pay?pa=${primaryProducerUpi}&pn=${encodeURIComponent(primaryProducerName)}&am=${estimatedTotal.toFixed(2)}&cu=INR&tn=FromVillage`}
                          className="w-full py-2.5 px-3 bg-[#205b3d] hover:bg-[#16442c] active:scale-[0.99] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-xs sm:hidden"
                        >
                          <span>Open in UPI App</span>
                        </a>

                        {/* Reference / UTR input */}
                        <div>
                          <label className="block text-[10px] sm:text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                            UPI Transaction Ref / UTR (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 423985729183"
                            value={upiRef}
                            onChange={(e) => setUpiRef(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#205b3d] font-mono"
                          />
                          <p className="text-[10px] text-gray-400 mt-1">
                            100% of this payment settles directly into {primaryProducerName}'s bank account.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Fields (if card selected) */}
                {paymentMethod === 'card' && (
                  <div className="bg-gray-50/70 rounded-xl p-3.5 sm:p-4 border border-gray-200/70 space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Name on Card
                      </label>
                      <input
                        type="text"
                        value={cardDetails.name}
                        onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#205b3d]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Card Number
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={cardDetails.number}
                          onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                          className="w-full pl-3 pr-10 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#205b3d] font-mono"
                        />
                        <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] sm:text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Expiration Date
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={cardDetails.expiry}
                          onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                          placeholder="MM/YY"
                          className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#205b3d] font-mono text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] sm:text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          CVC / CVV
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={cardDetails.cvc}
                          onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                          placeholder="CVC"
                          maxLength={4}
                          className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#205b3d] font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Back to Step 1 */}
                <div className="mt-5 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setCurrentStep(1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Cart & Delivery</span>
                  </button>
                </div>
              </div>

              {/* Delivery Address Summary Box */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#205b3d] flex items-center justify-center flex-shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Destination Doorstep</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{address.street}, {address.city}, {address.state} {address.zip}</p>
                    <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                      {deliveryTiming === 'today-slot' ? 'Delivery Today 2:00 PM – 4:00 PM' : 'Tomorrow Morning (8–10 AM)'}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Payment Summary */}
            <div className="lg:col-span-4 space-y-4 sm:space-y-5">
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-6 shadow-2xs">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-3 sm:mb-4">Payment Summary</h2>

                <div className="space-y-2 text-xs text-gray-600 pb-3 sm:pb-4 border-b border-gray-100">
                  <div className="flex justify-between">
                    <span>Items Total ({totalItemCount})</span>
                    <span className="font-semibold text-gray-900">${itemsSubtotal.toFixed(2)}</span>
                  </div>
                  {voucherApplied && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount (10%)</span>
                      <span className="font-semibold">-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className="font-semibold text-emerald-700">
                      {freshDeliveryFee === 0 ? 'FREE' : `$${freshDeliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Packaging & Taxes</span>
                    <span className="font-semibold text-gray-900">${(ecoPackagingFee + estimatedTax).toFixed(2)}</span>
                  </div>
                </div>

                <div className="py-3 sm:py-4 border-b border-gray-100 flex justify-between items-baseline">
                  <span className="text-xs sm:text-sm font-bold text-gray-900">Amount Due</span>
                  <span className="text-lg sm:text-xl font-black text-[#205b3d]">
                    ${estimatedTotal.toFixed(2)}
                  </span>
                </div>

                {/* Confirm Order CTA */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                  className="w-full mt-4 sm:mt-5 py-3.5 bg-[#205b3d] hover:bg-[#16442c] active:scale-[0.99] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span>Authorizing & Dispatching...</span>
                  ) : (
                    <>
                      <Lock size={13} />
                      <span>Confirm & Place Order (${estimatedTotal.toFixed(2)})</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-gray-400 text-center mt-2.5">
                  Encrypted transaction • 100% farm fresh guarantee
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== STEP 3: CONFIRMED ORDER SUCCESS ==================== */}
        {currentStep === 3 && confirmedOrder && (
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
            
            {/* Celebration Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 p-5 sm:p-10 shadow-sm text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 text-[#205b3d] flex items-center justify-center mx-auto mb-4 sm:mb-5 shadow-xs">
                <PackageCheck size={28} />
              </div>

              <span className="inline-block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full mb-2">
                Order {confirmedOrder.orderId} Confirmed
              </span>

              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Fresh Harvest is on its Way!
              </h1>

              <p className="text-xs text-gray-500 max-w-md mx-auto mt-2 leading-relaxed">
                Thank you for supporting regional regenerative growers! Your harvest box is being packed directly from village farms.
              </p>

              {/* Delivery ETA Highlight Banner */}
              <div className="my-5 sm:my-6 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#f2f7f4] border border-[#daf0e3] max-w-lg mx-auto flex items-center justify-between text-left">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white text-[#205b3d] flex items-center justify-center shadow-2xs flex-shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium block">Estimated Arrival</span>
                    <span className="text-xs font-bold text-gray-900">{confirmedOrder.timing}</span>
                  </div>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full uppercase tracking-wider">
                  ON TIME
                </span>
              </div>

              {/* Dispatch Timeline */}
              <div className="max-w-md mx-auto py-3 sm:py-4 border-t border-b border-gray-100 my-4 sm:my-6">
                <div className="flex items-center justify-between text-xs font-medium text-gray-600">
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] mb-1">✓</div>
                    <span className="text-[9px] sm:text-[10px] text-gray-800 font-bold">Received</span>
                  </div>
                  <div className="h-[2px] flex-1 bg-emerald-500 mx-1.5 sm:mx-2"></div>
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] mb-1 animate-pulse">2</div>
                    <span className="text-[9px] sm:text-[10px] text-emerald-800 font-bold">Packing</span>
                  </div>
                  <div className="h-[2px] flex-1 bg-gray-200 mx-1.5 sm:mx-2"></div>
                  <div className="flex flex-col items-center opacity-40">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-gray-300 flex items-center justify-center text-[10px] mb-1">3</div>
                    <span className="text-[9px] sm:text-[10px]">EV Transit</span>
                  </div>
                  <div className="h-[2px] flex-1 bg-gray-200 mx-1.5 sm:mx-2"></div>
                  <div className="flex flex-col items-center opacity-40">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-gray-300 flex items-center justify-center text-[10px] mb-1">4</div>
                    <span className="text-[9px] sm:text-[10px]">Delivered</span>
                  </div>
                </div>
              </div>

              {/* Order Items Breakdown */}
              <div className="max-w-lg mx-auto text-left space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Harvest Box Contents ({confirmedOrder.items.length} items)
                </h4>
                <div className="divide-y divide-gray-100 bg-gray-50/70 rounded-xl p-3 sm:p-4 border border-gray-100">
                  {confirmedOrder.items.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        {item.image_url && (
                          <img src={item.image_url} alt={item.title} className="w-8 h-8 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="font-semibold text-gray-900 block truncate">{item.title}</span>
                          <span className="text-[10px] text-gray-400">{item.quantity} × ${item.price.toFixed(2)}</span>
                        </div>
                      </div>
                      <span className="font-bold text-gray-900 ml-2">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="pt-2.5 flex justify-between items-baseline font-bold text-gray-900">
                    <span>Total Paid</span>
                    <span className="text-sm text-[#205b3d]">${confirmedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Direct UPI Settlement Notice */}
              {confirmedOrder.paymentMethod === 'upi' && (
                <div className="max-w-lg mx-auto mb-6 p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/90 text-left text-xs">
                  <div className="flex items-center justify-between font-bold text-emerald-900 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Check size={14} className="text-emerald-700" />
                      Direct Producer UPI Transfer
                    </span>
                    <span className="text-[10px] bg-emerald-200/90 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">
                      Settled to Grower
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-1">
                    Payment directly addressed to: <span className="font-mono font-bold text-emerald-950">{confirmedOrder.producerUpi}</span>
                  </p>
                  {confirmedOrder.upiRef && (
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Recorded UTR Reference: <span className="font-mono font-semibold">{confirmedOrder.upiRef}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3">
                <Link
                  href={`/orders?id=${confirmedOrder.orderId}`}
                  className="w-full sm:w-auto px-6 py-3 bg-[#205b3d] hover:bg-[#16442c] active:scale-95 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center justify-center gap-2"
                >
                  <PackageCheck size={15} />
                  <span>Track Live Order</span>
                </Link>
                <Link
                  href="/"
                  className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={15} />
                  <span>Back to Market</span>
                </Link>
                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-5 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Print Receipt
                </button>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Sticky Mobile Action Bar (Step 1: Proceed to Payment, Step 2: Confirm Order) */}
      {currentStep === 1 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-gray-400 block leading-tight">Total due</span>
              <span className="text-base font-black text-gray-900">${estimatedTotal.toFixed(2)}</span>
            </div>
            <button
              disabled={items.length === 0}
              onClick={() => {
                if (items.length === 0) return;
                setCurrentStep(2);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 py-3 px-4 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm ${
                items.length === 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-[#174e33] active:scale-[0.98]'
              }`}
            >
              <span>Proceed to Payment</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-gray-400 block leading-tight">Amount</span>
              <span className="text-base font-black text-[#205b3d]">${estimatedTotal.toFixed(2)}</span>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 bg-[#205b3d] active:scale-[0.98] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isProcessing ? (
                <span>Dispatching...</span>
              ) : (
                <>
                  <Lock size={13} />
                  <span>Confirm & Place Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}