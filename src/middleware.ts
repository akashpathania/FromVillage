import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project-id');

  if (!isSupabaseConfigured) {
    return response;
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Secure token authentication against Supabase Auth server
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Guard /admin routes with strict Role-Based Access Control (RBAC)
    if (request.nextUrl.pathname.startsWith('/admin')) {
      if (!user) {
        const redirectUrl = new URL('/auth', request.url);
        redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
      }

      // Check whether user profile has admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        // Authenticated but not an admin: redirect back to storefront
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
  } catch {
    return response;
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};