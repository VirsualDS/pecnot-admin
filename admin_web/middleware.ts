import { NextRequest, NextResponse } from "next/server";

function unauthorizedResponse() {
  return new NextResponse("Autenticazione richiesta", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="PECNOT Admin"',
      "Cache-Control": "no-store",
    },
  });
}

function isProtectedAdminPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/studios" ||
    pathname.startsWith("/studios/")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedAdminPath(pathname)) {
    return NextResponse.next();
  }

  const expectedUser = process.env.ADMIN_BASIC_AUTH_USER?.trim();
  const expectedPass = process.env.ADMIN_BASIC_AUTH_PASSWORD?.trim();

  if (!expectedUser || !expectedPass) {
    console.error(
      "ADMIN_BASIC_AUTH_USER o ADMIN_BASIC_AUTH_PASSWORD mancanti nelle env"
    );

    return new NextResponse("Configurazione autenticazione admin mancante", {
      status: 500,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorizedResponse();
  }

  const base64Credentials = authHeader.slice("Basic ".length).trim();

  let credentials = "";
  try {
    credentials = Buffer.from(base64Credentials, "base64").toString("utf8");
  } catch {
    return unauthorizedResponse();
  }

  const separatorIndex = credentials.indexOf(":");
  if (separatorIndex === -1) {
    return unauthorizedResponse();
  }

  const username = credentials.slice(0, separatorIndex);
  const password = credentials.slice(separatorIndex + 1);

  if (username !== expectedUser || password !== expectedPass) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/studios/:path*"],
};