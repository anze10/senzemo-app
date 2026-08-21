// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
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

  emailAndPassword: {
    enabled: true,
    // Onemogoči javno samoregistracijo - samo admin ustvarja uporabnike
    disableSignUp: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        // Resend-ov vgrajen testni pošiljatelj - deluje TAKOJ, brez verifikacije
        // lastne domene. Ko bo senzemo.com verificiran v Resend, zamenjaj nazaj
        // na "Senzemo <noreply@senzemo.com>".
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
    resetPasswordTokenExpiresIn: 3600 * 24, // 24 ur - dovolj časa da uporabnik ukrepa
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
      // POPRAVLJENO: required: false namesto true - uporabniki, ki jih
      // admin ustvari preko email/password (brez Googla), nimajo googleId,
      // in required: true bi povzročil constraint napako pri vsakem
      // takem createUser klicu.
      googleId: { type: "string", required: false, unique: true },
    },
  },

  plugins: [
    admin(), // omogoči auth.api.createUser, listUsers, banUser, itd. - MORA biti pred nextCookies
    nextCookies(), // mora biti zadnji v seznamu pluginov — poskrbi za pravilno nastavljanje cookie-jev iz server akcij
  ],
});
