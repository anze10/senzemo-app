"use server";

import { prisma } from "./prisma";

// Types for mailing data
export interface MailingData {
  id: number;
  userId: number;
  Date_of_monthly_report: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isSubscribed: boolean;
  user: {
    id: number;
    email: string;
    name: string;
  };
}

export interface CreateMailingData {
  userId: number;
  Date_of_monthly_report?: Date | null;
  isSubscribed?: boolean;
}

export interface UpdateMailingData {
  Date_of_monthly_report?: Date | null;
  isSubscribed?: boolean;
}

/**
 * Create a new mailing entry for a user
 */
export async function createMailing(
  data: CreateMailingData,
): Promise<MailingData> {
  try {
    const mailing = await prisma.mailing.create({
      data: {
        userId: data.userId,
        Date_of_monthly_report: data.Date_of_monthly_report || null,
        isSubscribed: data.isSubscribed ?? true,
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

    return mailing;
  } catch (error) {
    console.error("Error creating mailing entry:", error);
    throw new Error("Failed to create mailing entry");
  }
}

/**
 * Get mailing data by user ID
 */
export async function getMailingByUserId(
  userId: number,
): Promise<MailingData | null> {
  try {
    const mailing = await prisma.mailing.findUnique({
      where: { userId },
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

    return mailing;
  } catch (error) {
    console.error("Error fetching mailing data:", error);
    throw new Error("Failed to fetch mailing data");
  }
}

/**
 * Get all mailing entries
 */
export async function getAllMailing(): Promise<MailingData[]> {
  try {
    const mailings = await prisma.mailing.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return mailings;
  } catch (error) {
    console.error("Error fetching all mailing data:", error);
    throw new Error("Failed to fetch mailing data");
  }
}

/**
 * Get all subscribed users for mailing
 */
export async function getSubscribedUsers(): Promise<MailingData[]> {
  try {
    const subscribedMailings = await prisma.mailing.findMany({
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return subscribedMailings;
  } catch (error) {
    console.error("Error fetching subscribed users:", error);
    throw new Error("Failed to fetch subscribed users");
  }
}

/**
 * Update mailing data for a user
 */
export async function updateMailingByUserId(
  userId: number,
  data: UpdateMailingData,
): Promise<MailingData> {
  try {
    const updatedMailing = await prisma.mailing.update({
      where: { userId },
      data: {
        ...data,
        updatedAt: new Date(),
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

    return updatedMailing;
  } catch (error) {
    console.error("Error updating mailing data:", error);
    throw new Error("Failed to update mailing data");
  }
}

/**
 * Subscribe a user to mailing
 */
export async function subscribeUser(userId: number): Promise<MailingData> {
  try {
    // Check if mailing entry exists
    const existingMailing = await prisma.mailing.findUnique({
      where: { userId },
    });

    if (existingMailing) {
      // Update existing entry
      return await updateMailingByUserId(userId, { isSubscribed: true });
    } else {
      // Create new entry
      return await createMailing({ userId, isSubscribed: true });
    }
  } catch (error) {
    console.error("Error subscribing user:", error);
    throw new Error("Failed to subscribe user");
  }
}

/**
 * Unsubscribe a user from mailing
 */
export async function unsubscribeUser(userId: number): Promise<MailingData> {
  try {
    const updatedMailing = await updateMailingByUserId(userId, {
      isSubscribed: false,
    });
    return updatedMailing;
  } catch (error) {
    console.error("Error unsubscribing user:", error);
    throw new Error("Failed to unsubscribe user");
  }
}

/**
 * Set the monthly report date for a user
 */
export async function setMonthlyReportDate(
  userId: number,
  date: Date,
): Promise<MailingData> {
  try {
    const updatedMailing = await updateMailingByUserId(userId, {
      Date_of_monthly_report: date,
    });
    return updatedMailing;
  } catch (error) {
    console.error("Error setting monthly report date:", error);
    throw new Error("Failed to set monthly report date");
  }
}

/**
 * Delete mailing entry for a user
 */
export async function deleteMailingByUserId(userId: number): Promise<boolean> {
  try {
    await prisma.mailing.delete({
      where: { userId },
    });
    return true;
  } catch (error) {
    console.error("Error deleting mailing entry:", error);
    throw new Error("Failed to delete mailing entry");
  }
}

/**
 * Get users who should receive monthly reports (subscribed and have a report date set)
 */
export async function getUsersForMonthlyReport(): Promise<MailingData[]> {
  try {
    const usersForReport = await prisma.mailing.findMany({
      where: {
        isSubscribed: true,
        Date_of_monthly_report: {
          not: null,
        },
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
      orderBy: {
        Date_of_monthly_report: "asc",
      },
    });

    return usersForReport;
  } catch (error) {
    console.error("Error fetching users for monthly report:", error);
    throw new Error("Failed to fetch users for monthly report");
  }
}

/**
 * Bulk update subscription status for multiple users
 */
export async function bulkUpdateSubscription(
  userIds: number[],
  isSubscribed: boolean,
): Promise<number> {
  try {
    const result = await prisma.mailing.updateMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      data: {
        isSubscribed,
        updatedAt: new Date(),
      },
    });

    return result.count;
  } catch (error) {
    console.error("Error bulk updating subscriptions:", error);
    throw new Error("Failed to bulk update subscriptions");
  }
}

/**
 * Get mailing statistics
 */
export async function getMailingStatistics() {
  try {
    const stats = await prisma.mailing.aggregate({
      _count: {
        id: true,
      },
      where: {
        isSubscribed: true,
      },
    });

    const totalUsers = await prisma.user.count();
    const totalSubscribed = stats._count.id;
    const totalUnsubscribed = totalUsers - totalSubscribed;

    const usersWithReportDate = await prisma.mailing.count({
      where: {
        isSubscribed: true,
        Date_of_monthly_report: {
          not: null,
        },
      },
    });

    return {
      totalUsers,
      totalSubscribed,
      totalUnsubscribed,
      usersWithReportDate,
      subscriptionRate:
        totalUsers > 0 ? (totalSubscribed / totalUsers) * 100 : 0,
    };
  } catch (error) {
    console.error("Error fetching mailing statistics:", error);
    throw new Error("Failed to fetch mailing statistics");
  }
}
