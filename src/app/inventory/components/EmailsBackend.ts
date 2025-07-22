"use server";
import { prisma } from "~/server/DATABASE_ACTION/prisma";
import { getCurrentSession } from "~/server/LOGIN_LUCIA_ACTION/session";
import type { EmailSettings } from "./EmailReportManager";

/**
 * Updates or creates email settings for the current authenticated user
 * @param onOff - Whether email notifications are enabled
 * @param day - Day of the month to send reports (1-28)
 * @param subject - Email subject template (can include {date} placeholder)
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export async function UpdateOrSetEmailSettings(
  onOff: boolean,
  day: number,
  subject: string,
): Promise<boolean> {
  try {
    const session = await getCurrentSession();
    if (!session || !session.user) {
      console.error("No active session found or user not authenticated.");
      return false;
    }

    await prisma.mailing.upsert({
      where: { userId: session.user.id },
      update: {
        isSubscribed: onOff,
        Date_of_monthly_report: day,
        subject: subject,
      },
      create: {
        isSubscribed: onOff,
        Date_of_monthly_report: day,
        subject: subject,
        user: {
          connect: { id: session.user.id },
        },
      },
    });

    console.log(
      `Email settings updated for user ${session.user.id}: enabled=${onOff}, day=${day}`,
    );
    return true;
  } catch (error) {
    console.error("Error updating or setting email settings:", error);
    return false;
  }
}

/**
 * Gets email settings for the current authenticated user
 * Includes user information (email, name) from the session
 * @returns Promise<EmailSettings | null> - User's email settings or null if not found/not authenticated
 */

// Helper function to get all users with email notifications enabled
// Useful for scheduled email sending system
export async function getUsersWithEnabledEmails(): Promise<Array<{
  userId: string;
  userEmail: string;
  userName: string | null;
  dayOfMonth: number;
  subject: string;
}> | null> {
  try {
    const enabledUsers = await prisma.mailing.findMany({
      where: {
        isSubscribed: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return enabledUsers
      .map((setting) => ({
        userId: setting.userId.toString(),
        userEmail: setting.user?.email || "",
        userName: setting.user?.name || null,
        dayOfMonth: setting.Date_of_monthly_report ?? 1,
        subject: setting.subject ?? "Monthly Inventory Report - {date}",
      }))
      .filter((user) => user.userEmail); // Filter out users without email
  } catch (error) {
    console.error("Error fetching users with enabled emails:", error);
    return null;
  }
}

// Helper function to check if current user has email notifications enabled
export async function isCurrentUserEmailEnabled(): Promise<boolean> {
  try {
    const session = await getCurrentSession();
    if (!session || !session.user) {
      return false;
    }

    const settings = await prisma.mailing.findUnique({
      where: { userId: session.user.id },
      select: { isSubscribed: true },
    });

    return settings?.isSubscribed ?? false;
  } catch (error) {
    console.error("Error checking user email status:", error);
    return false;
  }
}

// Helper function to get users who should receive emails on a specific day
export async function getUsersForDay(dayOfMonth: number): Promise<Array<{
  userId: string;
  userEmail: string;
  userName: string | null;
  subject: string;
}> | null> {
  try {
    const users = await prisma.mailing.findMany({
      where: {
        isSubscribed: true,
        Date_of_monthly_report: dayOfMonth,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return users
      .map((setting) => ({
        userId: setting.userId.toString(),
        userEmail: setting.user?.email || "",
        userName: setting.user?.name || null,
        subject: setting.subject ?? "Monthly Inventory Report - {date}",
      }))
      .filter((user) => user.userEmail);
  } catch (error) {
    console.error("Error fetching users for specific day:", error);
    return null;
  }
}

export async function getEmailSettings(): Promise<EmailSettings | null> {
  try {
    const session = await getCurrentSession();
    if (!session || !session.user) {
      console.error("No active session found or user not authenticated.");
      return null;
    }

    const settings = await prisma.mailing.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!settings) {
      // Return default settings with user info if no settings exist yet
      return {
        isEnabled: false,
        dayOfMonth: 1,
        subject: "Monthly Inventory Report - {date}",
        userEmail: session.user.email || undefined,
        userName: session.user.name || undefined,
      };
    }

    // Map database fields to EmailSettings type
    const emailSettings: EmailSettings = {
      isEnabled: settings.isSubscribed,
      dayOfMonth: settings.Date_of_monthly_report ?? 1,
      subject: settings.subject ?? "Monthly Inventory Report - {date}",
      userEmail: settings.user?.email || session.user.email || undefined,
      userName: settings.user?.name || session.user.name || undefined,
    };

    return emailSettings;
  } catch (error) {
    console.error("Error fetching email settings:", error);
    return null;
  }
}
