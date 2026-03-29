import { prisma } from "@/lib/db";

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type ExpoPushResponse = {
  data?: Array<{
    status: "ok" | "error";
    details?: {
      error?: string;
    };
  }>;
};

const expoPushTokenPattern = /^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]+\]$/;

const isValidExpoPushToken = (token: string): boolean => {
  return expoPushTokenPattern.test(token);
};

export const sendPushNotificationToUser = async (
  tenantId: string,
  userId: string,
  payload: PushPayload
): Promise<void> => {
  const tokens = await prisma.notificationPushToken.findMany({
    where: {
      tenantId,
      userId,
    },
    select: {
      expoPushToken: true,
    },
  });

  if (tokens.length === 0) {
    return;
  }

  const validTokens = tokens
    .map((item) => item.expoPushToken.trim())
    .filter((token) => isValidExpoPushToken(token));

  if (validTokens.length === 0) {
    return;
  }

  const messages = validTokens.map((token) => ({
    to: token,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    priority: "high",
    channelId: "default",
  }));

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new Error(`Expo push feilet med status ${response.status}`);
  }

  const responseBody = (await response.json()) as ExpoPushResponse;
  const results = responseBody.data ?? [];

  const invalidTokens = validTokens.filter((token, index) => {
    const result = results[index];
    return result?.status === "error" && result.details?.error === "DeviceNotRegistered";
  });

  if (invalidTokens.length > 0) {
    await prisma.notificationPushToken.deleteMany({
      where: {
        tenantId,
        userId,
        expoPushToken: {
          in: invalidTokens,
        },
      },
    });
  }
};
