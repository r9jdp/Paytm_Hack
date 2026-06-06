import { auth } from "@/auth";

import { GeminiLivePage } from "./GeminiLivePage";

export const dynamic = "force-dynamic";

export default async function GeminiLiveRoute() {
  const session = await auth().catch(() => null);

  return (
    <GeminiLivePage
      access={!session?.user ? "signed_out" : session.user.role === "merchant" ? "merchant" : "wrong_role"}
      userName={session?.user?.name ?? null}
    />
  );
}
