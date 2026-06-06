import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAppRole, toPrismaRole } from "@/lib/roles";

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

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: toPrismaRole(role) }
  });

  return NextResponse.json({ role });
}
