'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Sprout, LogOut, LayoutDashboard, Plus } from 'lucide-react';
import { useCartStore } from '@/lib/cartStore';
import { supabase } from '@/lib/supabaseClient';

interface NavbarProps {
  onOpenCart: () => void;
}

export default function Navbar({ onOpenCart }: NavbarProps) {
  const router = useRouter();
  const { cart } = useCartStore();
  const [userProfile, setUserProfile] = useState<{ full_name: string; role: string } | null>(null);

  const totalCartCount = cart.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();
        if (data) setUserProfile(data);
      }
    }
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', session.user.id)
          .single();
        if (data) setUserProfile(data);
      } else {
        setUserProfile(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUserProfile(null);
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-900 flex items-center justify-center text-amber-400">
            <Sprout size={20} />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-stone-900 leading-none block">
              Village<span className="text-amber-700">Bazaar</span>
            </span>
            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
              Direct From Farmers
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {userProfile?.role === 'admin' && (
            <div className="flex items-center gap-2">
              <Link
                href="/admin/orders"
                className="text-xs font-bold text-stone-700 hover:text-emerald-900 bg-stone-100 px-3 py-1.5 rounded-lg flex items-center gap-1"
              >
                <LayoutDashboard size={14} /> Orders
              </Link>
              <Link
                href="/admin/add-product"
                className="text-xs font-bold text-white bg-emerald-900 hover:bg-emerald-800 px-3 py-1.5 rounded-lg flex items-center gap-1"
              >
                <Plus size={14} /> Add Item
              </Link>
            </div>
          )}

          {userProfile ? (
            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              <span className="text-xs font-bold text-stone-800 hidden sm:inline">
                {userProfile.full_name}
              </span>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-2 text-stone-400 hover:text-rose-600 rounded-lg transition"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="text-xs font-bold text-stone-700 hover:text-stone-900 px-3 py-1.5 rounded-lg border border-stone-200"
            >
              Sign In
            </Link>
          )}

          <button
            onClick={onOpenCart}
            className="relative p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition"
          >
            <ShoppingBag size={18} />
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-700 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}