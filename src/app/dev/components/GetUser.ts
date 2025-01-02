"use cache";

import { Session } from "lucia";
import { prisma } from "~/server/prisma";

export async function GetUseFromSession(session: Session) {
    return prisma.user.findUnique({ where: { id: session.userId } });
}