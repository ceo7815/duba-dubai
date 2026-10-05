import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function isMachine(pathname: string) {
  return (
    pathname.startsWith("/api/bot") ||
    pathname.startsWith("/api/stripe") ||
    pathname.startsWith("/api/shopify") ||
    pathname.startsWith("/o/")
  );
}

export async function proxy(request: NextRequest) {
  if (isMachine(request.nextUrl.pathname)) return NextResponse.next();

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const isLogin = request.nextUrl.pathname.startsWith("/login");

  if (!userId && !isLogin) {
    return withSession(supabaseResponse, request.nextUrl.clone(), "/login");
  }

  if (userId) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("active")
      .eq("id", userId)
      .maybeSingle();

    if (error) return supabaseResponse;

    if (!profile?.active) {
      await supabase.auth.signOut();
      return withSession(supabaseResponse, request.nextUrl.clone(), "/login");
    }

    if (isLogin) {
      return withSession(supabaseResponse, request.nextUrl.clone(), "/");
    }
  }

  return supabaseResponse;
}

function withSession(source: NextResponse, url: URL, pathname: string) {
  url.pathname = pathname;
  const redirect = NextResponse.redirect(url);
  source.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
