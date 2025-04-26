"use server"

import { prisma } from "~/server/DATABASE_ACTION/prisma";


export async function GetSensors() {
    return prisma.senzor.findMany();
}