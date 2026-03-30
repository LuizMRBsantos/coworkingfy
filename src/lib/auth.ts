import NextAuth, { DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { db } from "./db";

// ---------------------------------------------------------------------------
// Augmentação de tipos — expõe role e unitIds no objeto session.user
// ---------------------------------------------------------------------------

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      unitIds: string[];
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    unitIds: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    unitIds: string[];
  }
}

// ---------------------------------------------------------------------------
// Validação do payload de credentials
// ---------------------------------------------------------------------------

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Configuração NextAuth v5
// ---------------------------------------------------------------------------

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            userUnits: { select: { unitId: true } },
          },
        });

        if (!user?.password) return null;

        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          unitIds: user.userUnits.map((u) => u.unitId),
        };
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      // user só existe no primeiro login — persiste os campos no token
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.unitIds = user.unitIds;
      }
      return token;
    },

    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.unitIds = token.unitIds;
      return session;
    },
  },
});
