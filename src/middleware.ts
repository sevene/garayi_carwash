import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

// 1. Specify protected and public routes
const protectedRoutes = ['/admin', '/pos'];
const publicRoutes = ['/login', '/signup', '/'];

export default async function middleware(req: NextRequest) {
    // 2. Check if the current route is protected or public
    const path = req.nextUrl.pathname;
    const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
    const isPublicRoute = publicRoutes.some((route) => path === route);

    // 3. Decrypt the session from the cookie
    const cookie = req.cookies.get('session')?.value;

    if (path.startsWith('/pos') || path.startsWith('/admin')) {
        console.log(`[Middleware] Checking route: ${path}`);
        console.log(`[Middleware] Cookie present: ${!!cookie}`);
    }

    const session = cookie ? await verifySession(cookie) : null;

    if (cookie && !session && (path.startsWith('/pos') || path.startsWith('/admin'))) {
        console.log('[Middleware] Session verification failed (invalid signature or expired)');
    }

    // 4. Redirect
    // If trying to access a protected route without a session
    if (isProtectedRoute && !session) {
        return NextResponse.redirect(new URL('/login', req.nextUrl));
    }

    // If trying to access login page while already logged in
    if (isPublicRoute && session && path === '/login') {
        return NextResponse.redirect(new URL('/admin/dashboard/overview', req.nextUrl));
    }

    // 5. If it's the root path '/', redirect based on auth status
    if (path === '/') {
        if (session) {
            return NextResponse.redirect(new URL('/admin/dashboard/overview', req.nextUrl));
        } else {
            return NextResponse.redirect(new URL('/login', req.nextUrl));
        }
    }

    return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
