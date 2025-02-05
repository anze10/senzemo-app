"use cache";

import { Session } from "lucia";
import { prisma } from "src/server/DATABASE_ACTION/prisma";

export async function GetUseFromSession(session: Session) {
    return prisma.user.findUnique({ where: { id: Number(session.userId) } });
}
export async function getUserFromGoogleId(googleId: string) {
    return prisma.user.findUnique({ where: { googleId } });
}

interface GoogleData {
    email: string;
    picture: string;
}

export async function createUser(googleUserId: string, username: string, googleData: GoogleData) {

    return prisma.user.upsert({
        where: { email: googleData.email },
        update: {
            googleId: googleUserId,
            name: username,
            email: googleData.email,
            picture: googleData.picture,
            role: "user",

        },
        create: {
            googleId: googleUserId,
            name: username,
            email: googleData.email,
            picture: googleData.picture,
            role: "user",
        },
    });

}


