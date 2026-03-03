import { createServerClient, type CookieOptions } from "@supabase/ssr";
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
				get(name: string) {
					return request.cookies.get(name)?.value;
				},
				set(name: string, value: string, options: CookieOptions) {
					request.cookies.set({ name, value, ...options });
					response = NextResponse.next({
						request: { headers: request.headers },
					});
					response.cookies.set({ name, value, ...options });
				},
				remove(name: string, options: CookieOptions) {
					request.cookies.set({ name, value: "", ...options });
					response = NextResponse.next({
						request: { headers: request.headers },
					});
					response.cookies.set({ name, value: "", ...options });
				},
			},
		},
	);

	const {
		data: { user },
	} = await supabase.auth.getUser();
	const path = request.nextUrl.pathname;

	// 1. Define Public Access (Essential to prevent loops)
	const isLoginPage = path === "/login";
	const isLandingPage = path === "/";
	const isPublicAsset = path.includes("."); // matches favicon.ico, images, etc.

	// 2. The Guard: If NOT logged in and NOT on a public page, go to login
	if (!user && !isLoginPage && !isLandingPage && !isPublicAsset) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	// 3. The Auto-Enter: If logged in and hits landing/login, go to overview
	if (user && (isLoginPage || isLandingPage)) {
		return NextResponse.redirect(new URL("/overview", request.url));
	}

	return response;
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - .png, .jpg, .svg, etc.
		 */
		"/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
	],
};
