import { auth } from "@/auth";
import { HomeScreen } from "@/components/home-screen";
import { getMerchantIdentityForUser } from "@/lib/merchant-identity-store";
import { buildMerchantIdentityDefaults } from "@/lib/merchant-options";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth().catch(() => null);
  const merchantIdentity = session?.user?.id
    ? await getMerchantIdentityForUser(session.user.id).catch(() => null)
    : null;
  const merchantDefaults = session?.user?.id
    ? buildMerchantIdentityDefaults(session.user.id)
    : null;

  return (
    <HomeScreen
      merchantDefaults={merchantDefaults}
      merchantIdentity={merchantIdentity}
      session={session}
    />
  );
}
