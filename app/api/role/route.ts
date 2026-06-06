import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { updateAuthUserRole } from "@/lib/auth-user-store";
import { isAppRole } from "@/lib/roles";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { role?: unknown } | null;
  const role = body?.role;

  if (!isAppRole(role)) {
    return NextResponse.json({ error: "Role must be buyer or merchant." }, { status: 400 });
  }

  await updateAuthUserRole(session.user.id, role);

  return NextResponse.json({ role });
}
