import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { upsertAuthUser } from "@/lib/auth-user-store";
import { isAppRole, type AppRole } from "@/lib/roles";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt"
  },
  providers: [Google],
  callbacks: {
    async signIn({ user }) {
      const storedUser = await upsertAuthUser({
        name: user.name,
        email: user.email,
        image: user.image
      });

      user.id = storedUser.id;
      user.role = storedUser.role;

      return true;
    },
    jwt({ token, trigger, session, user }) {
      const nextRole = (session as { role?: unknown } | undefined)?.role;

      if (user) {
        token.sub = user.id;
        token.role = isAppRole(user.role) ? user.role : undefined;
      }

      if (trigger === "update" && isAppRole(nextRole)) {
        token.role = nextRole;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        (session.user as { role?: AppRole }).role = isAppRole(token.role) ? token.role : undefined;
      }

      return session;
    }
  }
});
