import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { serverConfig } from "@/lib/config/server";

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

  // Rate limit credential login attempts against brute-force attacks (IP + Target Account)
  if (pathname.startsWith("/api/auth/callback/credentials") && req.method === "POST") {
    const ip = getClientIp(req.headers);

    // Extract attempted email/username to prevent distributed credential stuffing (SEC-001)
    let targetAccount = "";
    try {
      const cloned = req.clone();
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
        const formData = await cloned.formData();
        targetAccount = (formData.get("email") as string) || (formData.get("username") as string) || "";
      } else if (contentType.includes("application/json")) {
        const json = await cloned.json();
        targetAccount = json.email || json.username || "";
      }
    } catch {}

    const normalizedAccount = targetAccount.trim().toLowerCase();

    const ipLimit = await rateLimit("login-auth-ip", ip, {
      windowMs: serverConfig.rateLimit.loginWindowMs,
      max: serverConfig.rateLimit.loginMax,
    });

    let accountLimit = { success: true };
    if (normalizedAccount) {
      accountLimit = await rateLimit("login-auth-account", normalizedAccount, {
        windowMs: serverConfig.rateLimit.loginWindowMs,
        max: serverConfig.rateLimit.loginMax,
      });
    }

    if (!ipLimit.success || !accountLimit.success) {
      const errorUrl = new URL("/login?error=TooManyAttempts", req.url).toString();
      const retryMinutes = Math.max(1, Math.ceil(serverConfig.rateLimit.loginWindowSec / 60));
      return NextResponse.json(
        { 
          url: errorUrl,
          error: `Too many login attempts. Please try again in ${retryMinutes} minute${retryMinutes > 1 ? "s" : ""}.` 
        },
        { 
          status: 429,
          headers: {
            "Retry-After": String(serverConfig.rateLimit.loginWindowSec),
          }
        }
      );
    }
  }

  // Allow NextAuth and Cron endpoints to proceed without requiring an admin session
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron")
  ) {
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
