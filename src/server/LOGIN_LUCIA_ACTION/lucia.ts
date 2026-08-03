// ~/server/DATABASE_ACTION/auth.ts (ali kjerkoli imaš to datoteko)
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { prisma } from "~/server/DATABASE_ACTION/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // <-- preveri: prej si uporabljal PrismaPg (Postgres), tu je pisalo "sqlite" — verjetno pomota
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [nextCookies()], // mora biti zadnji plugin — poskrbi, da se cookie pravilno nastavi iz server akcij
});

export const getUser = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: {
      name: true,
      email: true,
      image: true, // Better Auth uporablja polje "image", ne "picture" — preveri svoj prisma schema
    },
  });

  return dbUser;
};
