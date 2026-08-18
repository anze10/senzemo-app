"use server";

import { auth } from "src/server/LOGIN_LUCIA_ACTION/auth";
import { headers } from "next/headers";
import crypto from "crypto";

async function requireAdminHeaders() {
  return await headers();
}

export async function listUsersAction(params: {
  searchValue?: string;
  limit?: number;
  offset?: number;
}) {
  const requestHeaders = await requireAdminHeaders();
  const result = await auth.api.listUsers({
    query: {
      searchValue: params.searchValue,
      searchField: "email",
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      sortBy: "createdAt",
      sortDirection: "desc",
    },
    headers: requestHeaders,
  });
  return result;
}

export async function inviteUser(
  email: string,
  name: string,
  role: "user" | "admin" = "user",
) {
  const requestHeaders = await requireAdminHeaders();
  const tempPassword = crypto.randomBytes(24).toString("hex");

  const { user } = await auth.api.createUser({
    body: { email, name, password: tempPassword, role },
    headers: requestHeaders,
  });

  await auth.api.requestPasswordReset({
    body: {
      email,
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/ressetpass`,
    },
  });

  return { success: true, userId: user.id };
}

export async function resendPasswordResetAction(email: string) {
  await auth.api.requestPasswordReset({
    body: {
      email,
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/resetpass`,
    },
  });
  return { success: true };
}

export async function setRoleAction(userId: string, role: "user" | "admin") {
  const requestHeaders = await requireAdminHeaders();
  await auth.api.setRole({
    body: { userId, role },
    headers: requestHeaders,
  });
  return { success: true };
}

export async function banUserAction(userId: string, banReason?: string) {
  const requestHeaders = await requireAdminHeaders();
  await auth.api.banUser({
    body: { userId, banReason: banReason ?? "Onemogočen s strani admina" },
    headers: requestHeaders,
  });
  return { success: true };
}

export async function unbanUserAction(userId: string) {
  const requestHeaders = await requireAdminHeaders();
  await auth.api.unbanUser({
    body: { userId },
    headers: requestHeaders,
  });
  return { success: true };
}

export async function removeUserAction(userId: string) {
  const requestHeaders = await requireAdminHeaders();
  await auth.api.removeUser({
    body: { userId },
    headers: requestHeaders,
  });
  return { success: true };
}

export async function listUserSessionsAction(userId: string) {
  const requestHeaders = await requireAdminHeaders();
  const sessions = await auth.api.listUserSessions({
    body: { userId },
    headers: requestHeaders,
  });
  return sessions;
}

export async function revokeUserSessionsAction(userId: string) {
  const requestHeaders = await requireAdminHeaders();
  await auth.api.revokeUserSessions({
    body: { userId },
    headers: requestHeaders,
  });
  return { success: true };
}
