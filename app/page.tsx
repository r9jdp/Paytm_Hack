import { auth } from "@/auth";
import { HomeScreen } from "@/components/home-screen";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth().catch(() => null);

  return <HomeScreen session={session} />;
}
