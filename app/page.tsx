import { auth } from "@/auth";
import { HomeScreen } from "@/components/home-screen";

export default async function Home() {
  const session = await auth();

  return <HomeScreen session={session} />;
}
