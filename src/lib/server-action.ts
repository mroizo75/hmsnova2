import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z, ZodSchema } from "zod";
import { prisma } from "@/lib/db";

export type ActionContext = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    isSuperAdmin?: boolean;
    tenantId?: string | null;
  };
  session: any;
};

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function authAction<TInput, TOutput>(
  schema: ZodSchema<TInput>,
  handler: (input: TInput, ctx: ActionContext) => Promise<TOutput>
) {
  return async (rawInput: unknown): Promise<ActionResult<TOutput>> => {
    try {
      const session = await getServerSession(authOptions);

      if (!session?.user) {
        return { success: false, error: "Ikke autentisert" };
      }

      const input = schema.parse(rawInput);

      const ctx: ActionContext = {
        user: session.user,
        session,
      };

      const data = await handler(input, ctx);

      return { success: true, data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: "Ugyldig data" };
      }
      console.error("Server action error:", error);
      return { success: false, error: "Noe gikk galt" };
    }
  };
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tenants: {
        include: {
          tenant: true,
        },
      },
    },
  });

  return user;
}

