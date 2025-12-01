import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/types/supabase";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Define protected routes
  const protectedRoutes = ["/dashboard", "/company", "/admin"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Define public routes that should redirect if logged in
  const publicRoutes = ["/login", "/signup"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // If user is not logged in and tries to access protected route
  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If user is logged in
  if (user) {
    // If accessing public route (login/signup), redirect to dashboard
    if (isPublicRoute) {
       // We redirect to /dashboard and let the logic below handle role-based routing
       return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Fetch user profile to get role
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // --- DEBUG LOGS (Check your terminal!) ---
    console.log("--- MIDDLEWARE DEBUG ---");
    console.log("User Email:", user.email);
    console.log("Role Found:", profile?.role);
    console.log("Profile Error:", error);
    // -----------------------------------------

    const role = profile?.role;

    // Role-based redirection logic
    if (pathname.startsWith("/dashboard")) {
      // If user accesses /dashboard but is admin/company, redirect them
      if (role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      } else if (role === "company_admin" || role === "company_member") {
        return NextResponse.redirect(new URL("/company/dashboard", request.url));
      }
    } else if (pathname.startsWith("/company")) {
      // Only company_admin and company_member should access /company
      if (role && role !== "company_admin" && role !== "company_member") {
        if (role === "student") {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        } else if (role === "admin") {
          return NextResponse.redirect(new URL("/admin/dashboard", request.url));
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } else if (pathname.startsWith("/admin")) {
      // Only admin should access /admin
      if (role && role !== "admin") {
        if (role === "student") {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        } else if (role === "company_admin" || role === "company_member") {
          return NextResponse.redirect(new URL("/company/dashboard", request.url));
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};