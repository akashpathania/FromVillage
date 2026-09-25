'use client';

import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  ShoppingBag, 
  Check, 
  Sparkles, 
  Leaf, 
  Clock, 
  ShieldCheck, 
  Plus, 
  Minus,
  ArrowRight
} from 'lucide-react';
import { Product } from '@/types/product';
import { useCartStore } from '@/lib/cartStore';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onBuyNow: (product: Product) => void;
}

export default function ProductDetailModal({
  product,
  onClose,
  onBuyNow,
}: ProductDetailModalProps) {
  const { addToCart } = useCartStore();
  const [qty, setQty] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);

  if (!product) return null;

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) {
      addToCart({
        id: product.id,
        title: product.title,
        price: product.price,
        unit: product.unit,
        origin_village: product.origin_village,
        image_url: product.image_url,
        producer_id: product.producer_id,
        producer_upi: product.producer_upi,
      });
    }
    setAddedNotice(true);
    setTimeout(() => {
      setAddedNotice(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl border border-gray-100 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs border border-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition cursor-pointer shadow-xs"
        >
          <X size={16} />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Main Photo */}
          <div className="aspect-[4/3] w-full bg-gray-50 rounded-xl sm:rounded-2xl overflow-hidden relative border border-gray-100">
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs border border-gray-200 px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#205b3d] flex items-center gap-1 shadow-2xs">
              <Leaf size={11} />
              <span>Regenerative Harvest</span>
            </div>
          </div>

          {/* Title & Price Header */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <MapPin size={13} className="text-[#205b3d]" />
              <span className="font-medium">{product.origin_village || 'California Regenerative Collective'}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base sm:text-xl font-bold text-gray-900 tracking-tight">
                {product.title}
              </h2>
              <div className="text-right flex-shrink-0">
                <span className="text-base sm:text-lg font-black text-gray-900">
                  ${product.price.toFixed(2)}
                </span>
                <span className="text-xs text-gray-400 font-medium"> / {product.unit}</span>
              </div>
            </div>
          </div>

          {/* Harvest Description */}
          <p className="text-xs text-gray-600 leading-relaxed">
            {product.description ||
              'Cultivated with regenerative living-soil practices that rebuild organic matter, restore biodiversity, and maximize natural nutrient density. Delivered directly from the field without cold-storage detours.'}
          </p>

          {/* Farm Quality Highlights */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="bg-[#fcfbf9] border border-gray-100 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-gray-400 font-medium block">Purity</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">Zero Spray</span>
            </div>
            <div className="bg-[#fcfbf9] border border-gray-100 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-gray-400 font-medium block">Harvest</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">Morning Pick</span>
            </div>
            <div className="bg-[#fcfbf9] border border-gray-100 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-gray-400 font-medium block">Storage</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">Fresh 5-7 Days</span>
            </div>
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
          {/* Stepper */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-7 h-7 rounded-lg text-gray-600 hover:text-black flex items-center justify-center transition cursor-pointer"
            >
              <Minus size={13} />
            </button>
            <span className="w-8 text-center text-xs font-bold text-gray-900">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-7 h-7 rounded-lg text-gray-600 hover:text-black flex items-center justify-center transition cursor-pointer"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Add to Basket */}
          <button
            onClick={handleAdd}
            className="flex-1 py-3 px-3 bg-white hover:bg-gray-100 border border-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
          >
            {addedNotice ? (
              <>
                <Check size={14} className="text-emerald-600" />
                <span className="text-emerald-700 font-bold">Added to Basket!</span>
              </>
            ) : (
              <>
                <ShoppingBag size={14} />
                <span>Add ({qty}) · ${(product.price * qty).toFixed(2)}</span>
              </>
            )}
          </button>

          {/* Direct Buy Now */}
          <button
            onClick={() => onBuyNow(product)}
            className="py-3 px-4 bg-[#205b3d] hover:bg-[#16442c] active:scale-95 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0"
          >
            <span>Buy Now</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
