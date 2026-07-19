import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Modern SSR syntax to prevent deprecation warnings
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  const path = request.nextUrl.pathname;

  // 1. Define Public Access
  const isSignupSuccess = path === "/signup-success";
  const isLoginPage = path === "/login";
  const isLandingPage = path === "/";
  const isForgotPassword = path === "/forgot-password";
  const isPublicAsset = path.includes(".");
  const isPublicPage = isLoginPage || isLandingPage || isSignupSuccess || isForgotPassword;

  console.log("=== PROXY DEBUG ===");
  console.log("Path accessed:", path);
  console.log("User found in proxy?:", !!user);
  console.log("===================");

  // 2. The Guard: If NOT logged in and NOT on a public page, go to login
  if (!user && !isPublicPage && !isPublicAsset) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. The Auto-Enter: If logged in and hits landing/login, go to dashboard
  if (user && (isLoginPage || isLandingPage)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

// Keep your existing matcher config
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};