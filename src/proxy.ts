import { NextResponse, type NextRequest } from "next/server";
import { UNLOCK_COOKIE, isUnlocked, safeNext } from "@/server/passcode";

// Runs before every page and API request (see matcher). Without a valid unlock cookie:
// pages redirect to /unlock, API calls get 401. This is what keeps strangers from spending the OpenAI key.
export function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const unlocked = isUnlocked(request.cookies.get(UNLOCK_COOKIE)?.value);

    if (pathname === "/api/unlock") return NextResponse.next();
    if (pathname === "/unlock") {
        // Already unlocked: skip the passcode screen.
        return unlocked ? NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url)) : NextResponse.next();
    }
    if (unlocked) return NextResponse.next();

    if (pathname.startsWith("/api/")) return Response.json({ error: "Locked. Enter the passcode first." }, { status: 401 });

    const url = new URL("/unlock", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
}

export const config = {
    // Everything except Next's static assets and image files (those must load on the unlock page too).
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
