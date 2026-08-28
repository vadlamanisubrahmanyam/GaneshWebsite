import { prisma } from "@/lib/prisma";

type LogInput = {
  action: string;
  actorId?: string | null;
  actorEmail?: string | null;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

// Fire-and-forget audit trail. Wrapped in try/catch so a logging failure
// never breaks the actual user-facing action it's recording.
export async function logActivity(input: LogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata as any,
      },
    });
  } catch (err) {
    console.error("Audit log write failed (non-blocking):", err);
  }
}
