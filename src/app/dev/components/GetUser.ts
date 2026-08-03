import type { auth } from "src/server/LOGIN_LUCIA_ACTION/auth";
import { prisma } from "~/server/DATABASE_ACTION/prisma";

type Session = typeof auth.$Infer.Session.session;

export async function GetUseFromSession(session: Session) {
  return prisma.user.findUnique({ where: { id: Number(session.userId) } });
}

export async function getUserFromGoogleId(googleId: string) {
  return prisma.user.findUnique({ where: { googleId } });
}

interface GoogleData {
  email: string;
  picture: string; // to lahko pustiš, ker Google API vrne polje "picture" - samo mapping spodaj popravi
}

export async function createUser(
  googleUserId: string,
  username: string,
  googleData: GoogleData,
) {
  return prisma.user.upsert({
    where: { email: googleData.email },
    update: {
      googleId: googleUserId,
      name: username,
      email: googleData.email,
      image: googleData.picture, // <- picture -> image
      role: "user",
    },
    create: {
      googleId: googleUserId,
      name: username,
      email: googleData.email,
      image: googleData.picture, // <- picture -> image
      role: "user",
    },
  });
}
