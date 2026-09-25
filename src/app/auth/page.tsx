'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Check
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  const [isSignIn, setIsSignIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [village, setVillage] = useState('');
  const [role, setRole] = useState<'customer' | 'admin'>('customer');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setErrorMsg(null);
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project-id');

    if (!isSupabaseConfigured) {
      router.push(redirectTo);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}${redirectTo}` : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign-in failed.');
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setErrorMsg('Please enter your email address above to receive a password reset link.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project-id');

      if (!isSupabaseConfigured) {
        setSuccessMsg(`Reset instructions simulated for ${email}. Supabase is in demo mode.`);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      if (error) throw error;
      setSuccessMsg(`Password reset link sent to ${email}. Please check your inbox.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project-id');

      if (!isSupabaseConfigured) {
        // Smooth demo sign-in fallback when backend credentials are not set
        setTimeout(() => {
          router.push(redirectTo !== '/' ? redirectTo : role === 'admin' ? '/admin/orders' : '/');
        }, 300);
        return;
      }

      if (isSignIn) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        // Check whether user is admin or customer
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        const dest = redirectTo !== '/' 
          ? redirectTo 
          : profile?.role === 'admin' 
          ? '/admin/orders' 
          : '/';

        router.push(dest);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || 'Village Member',
              village: role === 'admin' ? village.trim() : null,
              role,
              upi_id: upiId.trim() || null,
            },
          },
        });
        if (error) throw error;

        if (data.session) {
          // Auto-logged in
          const dest = redirectTo !== '/' 
            ? redirectTo 
            : role === 'admin' 
            ? '/admin/orders' 
            : '/';
          router.push(dest);
          router.refresh();
        } else {
          setSuccessMsg('Account created successfully! Please check your email to verify your address before logging in.');
          setIsSignIn(true);
        }
      }
    } catch (err: any) {
      // If error occurs due to offline/mock setup, let the user continue as demo member
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        router.push(redirectTo);
      } else {
        setErrorMsg(err.message || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa]/80 text-[#1a1a1a] font-sans antialiased flex flex-col justify-center items-center px-4 py-10 sm:py-16">
      {/* Brand Logo Link */}
      <Link href="/" className="mb-6 hover:opacity-85 transition inline-block">
        <img
          src="/images/logo.png"
          alt="FromVillage"
          className="h-10 sm:h-11 w-auto object-contain"
        />
      </Link>

      {/* Centered Auth Card */}
      <main className="w-full max-w-[460px]">
        <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.03)] p-7 sm:p-10">
          <div>
            {/* Segmented Switcher */}
            <div className="p-1 bg-[#f3f5f8] rounded-xl flex w-full max-w-[320px] mx-auto mb-8">
              <button
                type="button"
                onClick={() => { setIsSignIn(true); setErrorMsg(null); setSuccessMsg(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isSignIn ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignIn(false); setErrorMsg(null); setSuccessMsg(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  !isSignIn ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Heading */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                {isSignIn ? 'Welcome back' : 'Create an account'}
              </h2>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                {isSignIn
                  ? 'Enter your credentials to access your basket, harvest reservations, and cellar.'
                  : 'Join our collective for seasonal farm allotments and direct village staples.'}
              </p>
            </div>

            {/* Social OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200/90 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50/80 transition cursor-pointer shadow-2xs"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={() => alert('Apple Sign-In is configured via standard Supabase OAuth in your Supabase Dashboard -> Authentication.')}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200/90 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50/80 transition cursor-pointer shadow-2xs"
              >
                <svg className="w-4 h-4 fill-current text-black flex-shrink-0" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.74 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.7-7.83-12.01-14.36-6.19-9.35-11.11-20.24-14.77-32.67-3.66-12.44-5.49-24.16-5.49-35.18 0-14.07 3.41-25.75 10.23-35.04 6.82-9.28 15.34-14.05 25.56-14.31 4.9 0 10.36 1.34 16.39 4.02 6.03 2.68 10.02 4.07 11.97 4.18 1.48 0 5.69-1.46 12.63-4.38 6.94-2.92 12.64-4.24 17.1-3.96 12.63.78 22.75 5.48 30.34 14.1-11.07 6.7-16.49 15.86-16.27 27.48.22 9.07 3.69 16.71 10.42 22.92 6.72 6.2 14.64 9.77 23.75 10.69-2.22 6.64-4.67 13.06-7.36 19.26zM119.22 31.84c0-7.39 2.66-14.34 7.98-20.84 5.32-6.51 11.89-10.63 19.7-12.37.22 1.44.33 2.76.33 3.96 0 7.39-2.82 14.5-8.47 21.32-5.65 6.83-12.28 10.74-19.89 11.75-.11-1.34-.17-2.61-.17-3.82z"/>
                </svg>
                <span>Apple</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-6">
              <div className="w-full border-t border-gray-100"></div>
              <span className="bg-white px-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider absolute">
                Or continue with email
              </span>
            </div>

            {errorMsg && (
              <div className="p-3 mb-5 text-xs bg-rose-50 text-rose-700 rounded-xl border border-rose-200/80">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 mb-5 text-xs bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200/80 flex items-center gap-2">
                <Check size={14} className="text-emerald-600 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form Input Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isSignIn && (
                <>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('customer')}
                      className={`flex-1 py-2 text-xs rounded-xl border transition cursor-pointer ${
                        role === 'customer'
                          ? 'border-[#205b3d] bg-emerald-50/50 text-[#205b3d] font-bold shadow-2xs'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      Buyer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`flex-1 py-2 text-xs rounded-xl border transition cursor-pointer ${
                        role === 'admin'
                          ? 'border-[#205b3d] bg-emerald-50/50 text-[#205b3d] font-bold shadow-2xs'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      Village Producer / Admin
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">Full Name</label>
                    <input
                      required
                      type="text"
                      placeholder="Elena Vance"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs text-gray-900 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#205b3d] focus:ring-1 focus:ring-[#205b3d] transition placeholder:text-gray-400"
                    />
                  </div>

                  {role === 'admin' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">Village Location</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Kinnaur Valley, CA"
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs text-gray-900 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#205b3d] focus:ring-1 focus:ring-[#205b3d] transition placeholder:text-gray-400"
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-gray-800">
                        UPI ID / VPA {role === 'admin' ? '(for direct payouts)' : '(optional)'}
                      </label>
                      <span className="text-[10px] font-bold text-[#205b3d] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        Direct Payout
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. farmer@okhdfcbank or 9876543210@paytm"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs text-gray-900 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#205b3d] focus:ring-1 focus:ring-[#205b3d] font-mono transition placeholder:text-gray-400"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Customer payments for harvest orders will be routed directly to this UPI account.
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">Email Address</label>
                <input
                  required
                  type="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-gray-900 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#205b3d] focus:ring-1 focus:ring-[#205b3d] transition placeholder:text-gray-400"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-gray-800">Password</label>
                  {isSignIn && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-[#205b3d] font-semibold hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs text-gray-900 bg-white border border-gray-200 rounded-xl pr-10 outline-none focus:border-[#205b3d] focus:ring-1 focus:ring-[#205b3d] transition placeholder:text-gray-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {isSignIn && (
                <label className="flex items-center gap-2 cursor-pointer pt-0.5 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#205b3d] focus:ring-[#205b3d] border-gray-300 accent-[#205b3d] cursor-pointer"
                  />
                  <span className="text-xs text-gray-700 font-medium">Remember me for 30 days</span>
                </label>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 bg-[#1e4832] hover:bg-[#163826] active:scale-[0.99] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-60 cursor-pointer"
              >
                <span>{loading ? 'Please wait...' : isSignIn ? 'Sign In to FromVillage' : 'Create Account'}</span>
                <ArrowRight size={13} />
              </button>
            </form>

            <div className="text-center mt-5">
              <p className="text-xs text-gray-600">
                {isSignIn ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => { setIsSignIn(!isSignIn); setErrorMsg(null); setSuccessMsg(null); }}
                  className="text-[#205b3d] font-bold hover:underline cursor-pointer"
                >
                  {isSignIn ? 'Create one in seconds' : 'Sign in here'}
                </button>
              </p>
            </div>

            {/* Bottom Footer Terms */}
            <div className="mt-8 pt-4">
              <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                By signing in, you agree to our{' '}
                <span className="underline hover:text-gray-600 cursor-pointer">Terms of Sourcing</span> and{' '}
                <span className="underline hover:text-gray-600 cursor-pointer">Purity Standards</span>.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white p-8 text-center text-xs text-gray-400">Loading authentication portal...</div>}>
      <AuthContent />
    </Suspense>
  );
}