'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ShoppingBag, ArrowRight, User, LogOut, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useCartStore } from '@/lib/cartStore';
import { Product } from '@/types/product';
import { DUMMY_PRODUCTS } from '@/lib/dummyData';
import CartDrawer from '@/components/CartDrawer';
import ProductDetailModal from '@/components/ProductDetailModal';

const CATEGORIES = ['All Items', 'Produce', 'Bakery', 'Dairy & Eggs', 'Pantry'];

export default function StorefrontPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Items');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const { cart, addToCart } = useCartStore();
  const totalCartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  const handleBuy = (product: Product) => {
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
    router.push('/checkout');
  };

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project-id');

      if (!isSupabaseConfigured) {
        setProducts(DUMMY_PRODUCTS);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setProducts(data);
        } else {
          setProducts(DUMMY_PRODUCTS);
        }
      } catch {
        setProducts(DUMMY_PRODUCTS);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  // Filter by category and search
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.origin_village?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All Items' ||
        (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user ?? null);
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
      } else {
        setProfile(null);
      }
    }
    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', session.user.id)
          .single();
        if (data) setProfile(data);
      } else {
        setProfile(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a] font-sans antialiased selection:bg-[#205b3d] selection:text-white pb-16 sm:pb-0">
      {/* Top Navigation Bar */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-6">
          {/* Logo & Navigation Tabs */}
          <div className="flex items-center gap-6 sm:gap-8 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition">
              <img
                src="/images/logo.png"
                alt="FromVillage"
                className="h-7 sm:h-8 w-auto object-contain"
              />
            </Link>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All Items');
                  setSearchQuery('');
                  const el = document.getElementById('catalog-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`transition cursor-pointer ${
                  selectedCategory === 'All Items' && !searchQuery
                    ? 'text-gray-900 font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Market
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Produce');
                  const el = document.getElementById('catalog-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`transition cursor-pointer ${
                  selectedCategory === 'Produce'
                    ? 'text-gray-900 font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Seasonal
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('about-section');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                  }
                }}
                className="text-gray-500 hover:text-gray-900 transition cursor-pointer"
              >
                About
              </button>
            </nav>
          </div>

          {/* Desktop Centered Search Bar */}
          <div className="flex-1 max-w-sm sm:max-w-md mx-auto hidden sm:block">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search groceries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#f7f7f7] hover:bg-[#f2f2f2] focus:bg-white border border-transparent focus:border-gray-300 rounded-md outline-none transition-colors"
              />
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 text-xs font-medium text-gray-700 flex-shrink-0">
            {profile?.role === 'admin' && (
              <Link
                href="/admin/orders"
                className="text-[11px] font-bold text-white bg-emerald-800 hover:bg-emerald-900 px-2.5 py-1 rounded-lg transition flex items-center gap-1 shadow-2xs"
              >
                <LayoutDashboard size={12} />
                <span>Admin</span>
              </Link>
            )}

            <Link
              href="/orders"
              className="text-gray-600 hover:text-gray-900 transition font-medium hidden xs:inline"
            >
              Orders
            </Link>

            {user ? (
              <div className="flex items-center gap-1.5 pl-1 border-l border-gray-200">
                <span className="text-gray-800 font-semibold text-xs hidden sm:inline max-w-[120px] truncate" title={profile?.full_name || user.email}>
                  {profile?.full_name || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="p-1.5 text-gray-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="text-gray-700 hover:text-gray-900 transition font-medium px-2 py-1 rounded-md border border-gray-200/80 bg-gray-50/60"
              >
                Sign In
              </Link>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 transition cursor-pointer ml-1"
              aria-label="Cart"
            >
              <ShoppingBag size={15} />
              <span>Cart ({totalCartCount})</span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="sm:hidden px-4 pb-2.5 pt-0.5">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search farm harvest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f4f4f4] focus:bg-white border border-transparent focus:border-gray-300 rounded-lg outline-none transition-colors"
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {/* Title Header & Category Pill Filters */}
        <div id="catalog-section" className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-8 scroll-mt-24">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Fresh Harvest & Essentials
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">
              Direct from California regenerative purveyors
            </p>
          </div>

          {/* Horizontal Scrollable Category Filter Pills on Mobile */}
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3 py-1.5 sm:py-1 rounded-full whitespace-nowrap transition-all duration-150 active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-[#0f1d2e] text-white font-medium shadow-sm'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 bg-gray-50 sm:bg-transparent'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2-Column on Mobile, 4-Column on Desktop Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-2.5 sm:p-3.5 animate-pulse bg-white">
                <div className="aspect-[4/3] bg-gray-100 rounded-lg mb-2.5 sm:mb-3" />
                <div className="h-3.5 bg-gray-100 rounded w-2/3 mb-1.5" />
                <div className="h-2.5 bg-gray-100 rounded w-1/3 mb-2.5 sm:mb-3" />
                <div className="h-7 sm:h-8 bg-gray-100 rounded-md" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 sm:py-20 border border-dashed border-gray-200 rounded-xl px-4">
            <p className="text-xs sm:text-sm text-gray-500 font-medium">No products found</p>
            <p className="text-[11px] sm:text-xs text-gray-400 mt-1">
              {searchQuery || selectedCategory !== 'All Items'
                ? 'Try adjusting your search or category filter.'
                : 'No products are currently available in the bazaar.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-gray-100/90 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between hover:border-gray-200 hover:shadow-xs transition-all duration-200 group"
              >
                <div>
                  {/* Clean Image Container */}
                  <div
                    onClick={() => setSelectedProductForDetail(product)}
                    className="aspect-[4/3] w-full bg-[#f8f8f8] rounded-lg overflow-hidden mb-2 sm:mb-3 relative cursor-pointer"
                  >
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-300 ease-out"
                      loading="lazy"
                    />
                  </div>

                  {/* Title & Price Header */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-2">
                    <h3
                      onClick={() => setSelectedProductForDetail(product)}
                      className="text-xs font-semibold text-gray-900 truncate cursor-pointer hover:text-[#205b3d] transition-colors"
                      title={product.title}
                    >
                      {product.title}
                    </h3>
                    <span className="text-xs font-bold text-gray-900 flex-shrink-0">
                      ${product.price.toFixed(2)}
                    </span>
                  </div>

                  {/* Village Origin & Unit Subtitle */}
                  <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 truncate">
                    {product.origin_village || 'Village Sourced'} · {product.unit}
                  </p>
                </div>

                {/* Dark Forest Green Buy Button */}
                <button
                  onClick={() => handleBuy(product)}
                  className="mt-2.5 sm:mt-3.5 w-full py-1.5 sm:py-2 bg-[#205b3d] hover:bg-[#1a4a32] active:bg-[#153d29] active:scale-[0.98] text-white text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  Buy
                </button>
              </div>
            ))}
          </div>
        )}

        {/* About Section */}
        <section id="about-section" className="mt-16 sm:mt-24 border-t border-gray-100 pt-10 sm:pt-14 scroll-mt-20">
          <div className="max-w-3xl">
            <span className="text-xs font-semibold text-[#205b3d] tracking-wider uppercase">About Our Collective</span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 tracking-tight">
              Regenerative village agriculture, direct to your kitchen table.
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-2.5 leading-relaxed">
              FromVillage connects you with independent, regenerative family farms and village producers across California. Harvested fresh at dawn and packed without industrial cold-storage detours, ensuring maximum nutrient density and exceptional flavor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 mt-8">
            <div className="bg-[#fcfbf9] border border-gray-100 p-4 rounded-xl">
              <span className="text-sm font-semibold text-gray-900 block mb-1">🌱 100% Regenerative</span>
              <p className="text-xs text-gray-500 leading-normal">Organic, living soil cultivation with zero toxic synthetic chemicals or sprays.</p>
            </div>
            <div className="bg-[#fcfbf9] border border-gray-100 p-4 rounded-xl">
              <span className="text-sm font-semibold text-gray-900 block mb-1">⏱️ Harvest to Home</span>
              <p className="text-xs text-gray-500 leading-normal">Dispatched rapidly within 24 hours of harvest for garden-fresh crispness.</p>
            </div>
            <div className="bg-[#fcfbf9] border border-gray-100 p-4 rounded-xl">
              <span className="text-sm font-semibold text-gray-900 block mb-1">🤝 Direct to Grower</span>
              <p className="text-xs text-gray-500 leading-normal">Over 80% of every dollar supports small family farmers and village growers directly.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Mobile Cart Bar (when basket has items) */}
      {totalCartCount > 0 && (
        <div className="sm:hidden fixed bottom-4 left-4 right-4 z-20">
          <Link
            href="/checkout"
            className="w-full py-3 px-4 bg-[#205b3d] text-white rounded-xl shadow-xl flex items-center justify-between font-semibold text-xs active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} />
              <span>{totalCartCount} in Basket (${cartSubtotal.toFixed(2)})</span>
            </div>
            <span className="flex items-center gap-1 bg-[#16442c] px-2.5 py-1 rounded-lg">
              Proceed <ArrowRight size={13} />
            </span>
          </Link>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="mt-16 sm:mt-24 border-t border-gray-100 py-6 sm:py-8 text-[11px] text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p>© {new Date().getFullYear()} FromVillage Co.</p>
          <div className="flex gap-6">
            <span className="hover:text-gray-600 cursor-pointer">Privacy</span>
            <span className="hover:text-gray-600 cursor-pointer">Terms</span>
            <span className="hover:text-gray-600 cursor-pointer">Contact</span>
          </div>
        </div>
      </footer>

      {/* Slide-out Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProductForDetail}
        onClose={() => setSelectedProductForDetail(null)}
        onBuyNow={handleBuy}
      />
    </div>
  );
}