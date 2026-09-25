'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Upload, 
  Sparkles, 
  Check, 
  Store, 
  Image as ImageIcon 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const PRESET_IMAGES = [
  { label: 'Apples', url: '/images/products/apples.jpg' },
  { label: 'Kale', url: '/images/products/kale.jpg' },
  { label: 'Tomatoes', url: '/images/products/tomatoes.jpg' },
  { label: 'Strawberries', url: '/images/products/strawberries.jpg' },
  { label: 'Sourdough', url: '/images/products/sourdough.jpg' },
  { label: 'Eggs', url: '/images/products/eggs.jpg' },
  { label: 'Milk', url: '/images/products/milk.jpg' },
  { label: 'Juice', url: '/images/products/juice.jpg' },
];

export default function AddProductPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('lb');
  const [originVillage, setOriginVillage] = useState('');
  const [category, setCategory] = useState('Produce');
  const [imageUrl, setImageUrl] = useState('/images/products/apples.jpg');
  const [stockQuantity, setStockQuantity] = useState('50');
  const [producerUpi, setProducerUpi] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          const { data } = await supabase
            .from('profiles')
            .select('upi_id, village')
            .eq('id', user.id)
            .single();
          if (data?.upi_id) setProducerUpi(data.upi_id);
          if (data?.village) setOriginVillage((prev) => prev || data.village);
        }
      } catch {
        // ignore
      }
    }
    loadUserProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const priceNum = parseFloat(price);
    const stockNum = parseInt(stockQuantity, 10) || 50;

    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg('Please enter a valid positive price.');
      setLoading(false);
      return;
    }

    try {
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project-id');

      if (isSupabaseConfigured) {
        const { error } = await supabase.from('products').insert([
          {
            title: title.trim(),
            description: description.trim(),
            price: priceNum,
            unit: unit.trim() || 'each',
            origin_village: originVillage.trim() || 'California Farm',
            category,
            image_url: imageUrl.trim(),
            stock_quantity: stockNum,
            is_available: true,
            producer_id: currentUserId,
            producer_upi: producerUpi.trim() || null,
          },
        ]);

        if (error) throw error;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/products');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create product listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbfb] text-[#1a1a1a] font-sans antialiased selection:bg-[#205b3d] selection:text-white pb-24">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/admin/products"
            className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft size={15} />
            <span>Back to Catalog</span>
          </Link>

          <span className="text-xs font-bold text-gray-900">
            Add Harvest Item
          </span>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Create Harvest Listing
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            List fresh produce, bakery, or pasture staples direct from regional growers.
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
            <Check size={16} />
            <span>Product listed successfully! Redirecting to catalog...</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200/80 rounded-2xl p-5 sm:p-7 shadow-2xs space-y-5">
          
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Item Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Wild Coastal Blackberries"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#205b3d] transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Harvest Story & Description
            </label>
            <textarea
              rows={3}
              placeholder="Describe soil practices, harvest schedule, and flavor profile..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#205b3d] transition resize-none"
            />
          </div>

          {/* Price, Unit & Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">
                Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="4.50"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#205b3d] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">
                Selling Unit *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#205b3d] transition cursor-pointer"
              >
                <option value="lb">lb (Pound)</option>
                <option value="bunch">bunch</option>
                <option value="16 oz">16 oz basket</option>
                <option value="dozen">dozen</option>
                <option value="loaf">loaf</option>
                <option value="half gallon">half gallon</option>
                <option value="each">each</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">
                Initial Stock *
              </label>
              <input
                type="number"
                required
                placeholder="50"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#205b3d] transition"
              />
            </div>
          </div>

          {/* Category & Origin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#205b3d] transition cursor-pointer"
              >
                <option value="Produce">Produce</option>
                <option value="Bakery">Bakery</option>
                <option value="Dairy & Eggs">Dairy & Eggs</option>
                <option value="Pantry">Pantry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">
                Village / Farm Origin *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sonoma Valley Growers, CA"
                value={originVillage}
                onChange={(e) => setOriginVillage(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#205b3d] transition"
              />
            </div>
          </div>

          {/* Direct Payout UPI ID */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-gray-900">
                Producer Payout UPI ID
              </label>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                Direct Payout
              </span>
            </div>
            <input
              type="text"
              placeholder="e.g. farmer@okhdfcbank or 9876543210@paytm"
              value={producerUpi}
              onChange={(e) => setProducerUpi(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205b3d] font-mono transition"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              When customers checkout with UPI, their payment will be routed directly to this UPI address. Pre-filled from your producer profile.
            </p>
          </div>

          {/* Image Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Product Image URL
            </label>
            <input
              type="text"
              required
              placeholder="/images/products/apples.jpg or https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#205b3d] transition"
            />

            {/* Presets */}
            <div className="mt-3">
              <span className="text-[11px] text-gray-400 block mb-1.5 font-medium">Or pick an existing photo asset:</span>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {PRESET_IMAGES.map((img) => (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => setImageUrl(img.url)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition cursor-pointer flex-shrink-0 ${
                      imageUrl === img.url
                        ? 'border-[#205b3d] bg-emerald-50 text-[#205b3d] font-semibold'
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <img src={img.url} alt={img.label} className="w-4 h-4 rounded object-cover" />
                    <span>{img.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#205b3d] hover:bg-[#16442c] active:scale-[0.99] text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Plus size={15} />
              <span>{loading ? 'Publishing Listing...' : 'Publish Harvest Item'}</span>
            </button>
          </div>

        </form>

      </main>
    </div>
  );
}
