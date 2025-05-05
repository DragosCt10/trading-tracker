import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import { createClient } from '@/utils/supabase/server';

export async function middleware(request: NextRequest) {
  // Update the session first
  const response = await updateSession(request);
  
  // Check if the request is for the protected route
  const url = new URL(request.url);
  if (url.pathname === '/trades/new') {
    // Create a Supabase client
    const supabase = await createClient();
    
    // Get the session
    const { data: { session } } = await supabase.auth.getSession();
    
    // If no session, redirect to login
    if (!session) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirectTo', url.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - update-password (password update page)
     * - reset-password (password reset page)
     */
    '/((?!_next/static|_next/image|favicon.ico|update-password|signup|reset-password|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 