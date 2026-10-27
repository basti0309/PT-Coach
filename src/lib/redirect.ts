import { NextResponse, type NextRequest } from "next/server";

/**
 * Absolute Weiterleitung auf denselben Host, den der Browser aufgerufen hat
 * (Host/X-Forwarded-Host), damit Sitzungs-Cookies erhalten bleiben.
 */
export function redirectSameHost(request: NextRequest, path: string, status = 307): NextResponse {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const base = host ? `${proto}://${host}` : request.url;
  return NextResponse.redirect(new URL(path, base), status);
}
