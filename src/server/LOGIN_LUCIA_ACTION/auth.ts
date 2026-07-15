// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "src/server/DATABASE_ACTION/prisma";

// Better Auth interno povsod predpostavlja, da je userId string (glej
// https://github.com/better-auth/better-auth/issues/2349 - to je namerno
// in ne bo popravljeno). Naša Prisma shema ima User.id kot Int (obstoječi
// avtoinkrement), zato moramo userId ročno pretvarjati na meji med
// Better Auth in Prisma - v databaseHooks spodaj.
function toIntId(value: unknown): number {
  return typeof value === "string" ? parseInt(value, 10) : (value as number);
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  advanced: {
    database: {
      generateId: (options) => {
        if (options.model === "user") {
          return false; // pusti Postgresu, da avtoinkrementira (obstoječi User.id ostane Int)
        }
        return crypto.randomUUID(); // Session/Account/Verification dobijo string UUID
      },
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  databaseHooks: {
    account: {
      create: {
        before: async (account) => {
          (account as { userId: unknown }).userId = toIntId(account.userId);
          // ničesar ne vračamo - Better Auth uporabi isti (zdaj mutiran) objekt naprej
        },
      },
      update: {
        before: async (account) => {
          (account as { userId: unknown }).userId = toIntId(account.userId);
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          (session as { userId: unknown }).userId = toIntId(session.userId);
        },
      },
      update: {
        before: async (session) => {
          (session as { userId: unknown }).userId = toIntId(session.userId);
        },
      },
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      accessType: "offline",
      prompt: "select_account consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
      ],
      // hd: "company.com",
      mapProfileToUser: (profile) => {
        return {
          googleId: profile.sub,
        };
      },
    },
  },

  user: {
    additionalFields: {
      role: { type: "string", required: false },
      googleId: { type: "string", required: true, unique: true },
    },
  },

  plugins: [nextCookies()], // mora biti zadnji v seznamu pluginov — poskrbi za pravilno nastavljanje cookie-jev iz server akcij
});
