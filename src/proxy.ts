import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const authHandler = withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const pathname = req.nextUrl.pathname;
    const isAuthPage = pathname.startsWith("/login");
    const isApi = pathname.startsWith("/api");

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return null;
    }

    if (!isAuth) {
      if (isApi) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export async function proxy(req: NextRequest, event: NextFetchEvent) {
  const pathname = req.nextUrl.pathname;

  // Rate limit credential login attempts against brute-force attacks
  if (pathname.startsWith("/api/auth/callback/credentials") && req.method === "POST") {
    const ip = getClientIp(req.headers);
    const limit = rateLimit("login-auth", ip, {
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 10, // max 10 attempts per 5 minutes per IP
    });

    if (!limit.success) {
      const errorUrl = new URL("/login?error=TooManyAttempts", req.url).toString();
      return NextResponse.json(
        { 
          url: errorUrl,
          error: "Too many login attempts. Please try again in 5 minutes." 
        },
        { 
          status: 429,
          headers: {
            "Retry-After": "300",
          }
        }
      );
    }
  }

  // Allow NextAuth and Cron endpoints to proceed without requiring an existing session
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  return (authHandler as any)(req, event);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /_next/static (static files)
     * 2. /_next/image (image optimization files)
     * 3. /favicon.ico, /icon.png, and public static image files
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
