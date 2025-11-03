import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SessionUser } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser;

  // Kun superadmin har tilgang til users
  if (!user?.isSuperAdmin) {
    return NextResponse.redirect(new URL("/admin", process.env.NEXTAUTH_URL));
  }

  return NextResponse.next();
}

