import { auth } from "@/auth";
import { HomeScreen } from "@/components/home-screen";
import { getMerchantIdentityForUser, listMerchantSellers } from "@/lib/merchant-identity-store";
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
  const merchantSellers = await listMerchantSellers().catch(() => []);

  return (
    <HomeScreen
      merchantDefaults={merchantDefaults}
      merchantIdentity={merchantIdentity}
      merchantSellers={merchantSellers}
      session={session}
    />
  );
}
