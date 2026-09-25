'use client';

import React from 'react';
import Link from 'next/link';
import { X, Trash2, ArrowRight, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/lib/cartStore';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, removeFromCart, updateQuantity } = useCartStore();
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-md bg-white shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-5 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-[#205b3d]" />
              <h2 className="text-base font-bold text-stone-900">Your Basket</h2>
              <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-semibold">
                {cart.reduce((t, i) => t + i.quantity, 0)}
              </span>
            </div>
            <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer">
              <X size={20} />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 divide-y divide-stone-100">
            {cart.length === 0 ? (
              <div className="text-center py-20 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-stone-50 flex items-center justify-center text-stone-300 mb-3">
                  <ShoppingBag size={24} />
                </div>
                <p className="text-stone-600 font-medium text-sm">Your basket is empty</p>
                <p className="text-stone-400 text-xs mt-1">Explore our farm harvest to add fresh items</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-[#205b3d] text-white text-xs font-semibold rounded-md hover:bg-[#1a4a32] transition cursor-pointer"
                >
                  Browse Harvest
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="py-3.5 flex items-center gap-3">
                  {/* Thumbnail */}
                  {item.image_url ? (
                    <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  ) : null}

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-stone-900 truncate">{item.title}</h4>
                    <p className="text-[11px] text-stone-500">
                      ${item.price.toFixed(2)} · {item.origin_village || item.farm || 'Village Sourced'}
                    </p>
                    
                    {/* Stepper */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center bg-gray-100 rounded border border-gray-200/60 p-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-5 h-5 rounded bg-white text-gray-700 hover:text-black flex items-center justify-center text-[10px] cursor-pointer shadow-2xs"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-xs font-semibold text-gray-900 px-2 min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-5 h-5 rounded bg-white text-gray-700 hover:text-black flex items-center justify-center text-[10px] cursor-pointer shadow-2xs"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                      <span className="text-xs font-bold text-gray-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1.5 text-stone-300 hover:text-rose-600 transition cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cart Drawer Checkout Footer */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-gray-100 bg-gray-50">
              <div className="flex justify-between items-center mb-3 text-xs text-gray-600">
                <span>Estimated Subtotal</span>
                <span className="font-bold text-gray-900 text-sm">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <Link
                href="/checkout"
                onClick={onClose}
                className="w-full py-2.5 bg-[#205b3d] hover:bg-[#16442c] text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}