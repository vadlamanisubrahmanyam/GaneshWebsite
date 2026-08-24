import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

export async function requireRole(roles: Array<"USER" | "TOPIC_OWNER" | "ADMIN">) {
  const session = await requireSession();
  const role = (session.user as any).role ?? "USER";
  if (!roles.includes(role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function getSessionOrNull() {
  return getServerSession(authOptions);
}
