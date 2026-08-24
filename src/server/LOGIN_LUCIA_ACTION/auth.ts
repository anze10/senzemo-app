// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { headers } from "next/headers";
import { Resend } from "resend";
import { prisma } from "src/server/DATABASE_ACTION/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

// Better Auth interno povsod predpostavlja, da je userId string (glej
// https://github.com/better-auth/better-auth/issues/2349 - to je namerno
// in ne bo popravljeno). Naša Prisma shema ima User.id kot Int (obstoječi
// avtoinkrement), zato moramo userId ročno pretvarjati na meji med
// Better Auth in Prisma - v databaseHooks spodaj.
function toIntId(value: unknown): number {
  return typeof value === "string" ? parseInt(value, 10) : (value as number);
}

export const auth = betterAuth({
  // Eksplicitno nastavi (namesto zanašanja na implicitno branje env) -
  // odpravi "Base URL is not set" opozorilo, ki smo ga videli med buildom,
  // in je bolj robustno za Docker/Traefik postavitev
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  // Eksplicitno dovoljena izvorišča - pomembno zdaj ko app teče za Traefik
  // reverse proxy-jem, prepreči morebitne bodoče CORS/origin probleme
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL!],

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
          const userId = toIntId(account.userId);
          if (Number.isNaN(userId)) {
            throw new Error(
              `toIntId vrnil NaN za account.userId=${String(account.userId)} - preveri format`,
            );
          }
          (account as { userId: unknown }).userId = userId;
        },
      },
      update: {
        before: async (account) => {
          const userId = toIntId(account.userId);
          if (Number.isNaN(userId)) {
            throw new Error(
              `toIntId vrnil NaN za account.userId=${String(account.userId)} - preveri format`,
            );
          }
          (account as { userId: unknown }).userId = userId;
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const userId = toIntId(session.userId);
          if (Number.isNaN(userId)) {
            throw new Error(
              `toIntId vrnil NaN za session.userId=${String(session.userId)} - preveri format`,
            );
          }
          (session as { userId: unknown }).userId = userId;
        },
      },
      update: {
        before: async (session) => {
          const userId = toIntId(session.userId);
          if (Number.isNaN(userId)) {
            throw new Error(
              `toIntId vrnil NaN za session.userId=${String(session.userId)} - preveri format`,
            );
          }
          (session as { userId: unknown }).userId = userId;
        },
      },
    },
  },

  // Nadzor nad dolžino/obnavljanjem seje - uporabnik se MORA znova prijaviti
  // po 8h neaktivnosti; ob vsaki aktivnosti se rok podaljša (če je manj kot
  // updateAge star), da aktiven uporabnik ni po nepotrebnem odjavljen
  session: {
    expiresIn: 60 * 60 * 3, // 8 ur
    updateAge: 60 * 60, // podaljšaj vsako uro aktivnosti
  },

  // Osnovna zaščita pred brute-force poskusi prijave - zdaj ko je app
  // javno dostopna preko tool.senzemo.com, ne samo lokalno
  rateLimit: {
    enabled: true,
    window: 60, // 60 sekund
    max: 10, // max 10 poskusov na okno (per IP)
  },

  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: "anze@repse.si",
        to: user.email,
        subject: "Nastavi geslo za svoj Senzemo račun",
        html: `
          <p>Zdravo${user.name ? " " + user.name : ""},</p>
          <p>Administrator je ustvaril tvoj račun. Klikni spodnjo povezavo, da nastaviš svoje geslo:</p>
          <p><a href="${url}">Nastavi geslo</a></p>
          <p>Če te povezave nisi pričakoval, jo lahko ignoriraš.</p>
        `,
      });
    },
    resetPasswordTokenExpiresIn: 3600 * 24,
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
      googleId: { type: "string", required: false, unique: true },
    },
  },

  plugins: [admin(), nextCookies()],
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
