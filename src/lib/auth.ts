import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import type { AuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.hashedPassword) return null;
        const isValid = await compare(
          credentials.password,
          user.hashedPassword,
        );
        if (!isValid) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt(params: any) {
      const { token, user, trigger, session } = params as {
        token: JWT;
        user?: {
          id?: string | null;
          name?: string | null;
          email?: string | null;
        } | null;
        trigger?: "signIn" | "update" | "signUp";
        session?: Session;
      };
      // On initial sign-in, persist user fields into the token
      if (user) {
        (token as any).id = (user as any).id ?? token.sub;
        token.name = user.name ?? token.name;
        token.email = user.email ?? token.email;
        (token as any).picture = (user as any).image ?? (token as any).picture;
      }

      // When explicitly updating the session, allow refreshing fields from session.user
      if (trigger === "update" && session?.user) {
        token.name = session.user.name ?? token.name;
        token.email = session.user.email ?? token.email;
        (token as any).picture =
          (session.user as any).image ?? (token as any).picture;
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        // Ensure the user id is available on the session
        session.user.id = (token.sub ?? (token as any).id) as string;

        // Populate basic fields from the JWT to avoid hitting the DB on every session fetch
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        (session.user as any).image =
          (token as any).picture ?? (session.user as any).image;
      }
      return session;
    },
  },
};
