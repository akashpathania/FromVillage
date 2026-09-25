'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Package, 
  Check, 
  X, 
  ArrowLeft,
  Store,
  ExternalLink,
  Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { DUMMY_PRODUCTS } from '@/lib/dummyData';
import { Product } from '@/types/product';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const isSupabaseConfigured =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project-id');

        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            setProducts(data);
            setLoading(false);
            return;
          }
        }
      } catch {
        // ignore
      }

      // Fallback
      setProducts(DUMMY_PRODUCTS);
      setLoading(false);
    }
    load();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to remove "${title}" from the catalog?`)) return;

    // Remove from UI
    setProducts((prev) => prev.filter((p) => p.id !== id));

    // Remove from Supabase if connected
    try {
      await supabase.from('products').delete().eq('id', id);
    } catch {
      // ignore
    }

    setNotice(`"${title}" has been removed.`);
    setTimeout(() => setNotice(null), 3000);
  };

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCat === 'All' || p.category === selectedCat;
    const matchSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.origin_village?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const categories = ['All', 'Produce', 'Bakery', 'Dairy & Eggs', 'Pantry'];

  return (
    <div className="min-h-screen bg-[#fbfbfb] text-[#1a1a1a] font-sans antialiased selection:bg-[#205b3d] selection:text-white pb-24">
      {/* Header */}
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
              Product Catalog Manager
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/orders"
              className="text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition"
            >
              Order Operations
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {notice && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <Check size={14} />
            <span>{notice}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Harvest & Grocery Catalog ({products.length})
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Direct pricing, inventory availability, and regional farm origins.
            </p>
          </div>

          {/* Quick Add Button */}
          <Link
            href="/admin/add-product"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205b3d] hover:bg-[#16442c] text-white text-xs font-semibold rounded-xl transition shadow-xs"
          >
            <Plus size={14} />
            <span>New Harvest Listing</span>
          </Link>
        </div>

        {/* Filter Controls */}
        <div className="bg-white border border-gray-200/80 rounded-xl p-3 sm:p-4 mb-6 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full md:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                  selectedCat === cat
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title or village..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#205b3d] transition"
            />
          </div>
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="bg-white border border-gray-200/80 rounded-xl p-12 text-center text-xs text-gray-400 animate-pulse">
            Loading catalog items...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <Package size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs font-semibold text-gray-700">No products match your filter</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Try selecting another category or clear your search.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200/80 rounded-xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Village Origin</th>
                    <th className="py-3 px-4">Retail Price</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image_url}
                            alt={p.title}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-gray-900 block truncate max-w-[200px]">
                              {p.title}
                            </span>
                            <span className="text-[10px] text-gray-400">Unit: {p.unit}</span>
                            {p.producer_upi && (
                              <span className="block text-[10px] text-[#205b3d] font-mono font-medium">
                                UPI: {p.producer_upi}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[10px] font-medium">
                          {p.category || 'Produce'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-600">
                        {p.origin_village || 'Village Sourced'}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        ${p.price.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDelete(p.id, p.title)}
                          title="Delete from Catalog"
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
