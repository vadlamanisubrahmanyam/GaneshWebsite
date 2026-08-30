"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/guards";
import { uploadPdf, uploadJpeg } from "@/lib/storage";
import { logActivity } from "@/lib/audit";

// ---------- Topic / Q&A ----------

export async function postQaItem(topicId: string, formData: FormData) {
  const session = await requireSession();
  const userId = (session.user as any).id as string;

  const type = formData.get("type") === "review" ? "REVIEW" : "QUESTION";
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const ratingRaw = formData.get("rating");
  const rating = type === "REVIEW" && ratingRaw ? Number(ratingRaw) : null;

  if (!title) throw new Error("Title is required");

  const item = await prisma.qAItem.create({
    data: { topicId, authorId: userId, type, title, body, rating },
  });

  await logActivity({
    action: type === "REVIEW" ? "REVIEW_POSTED" : "QUESTION_POSTED",
    actorId: userId,
    actorEmail: session.user?.email,
    targetType: "QAItem",
    targetId: item.id,
    metadata: { topicId, title },
  });

  revalidatePath(`/topics/${topicId}`);
}

export async function deleteQaItem(topicId: string, qaItemId: string) {
  // Only Topic Owners or Admins can delete others' Q&A/reviews.
  const session = await requireRole(["TOPIC_OWNER", "ADMIN"]);
  await prisma.qAItem.delete({ where: { id: qaItemId } });

  await logActivity({
    action: "QA_DELETED",
    actorId: (session.user as any).id,
    actorEmail: session.user?.email,
    targetType: "QAItem",
    targetId: qaItemId,
    metadata: { topicId },
  });

  revalidatePath(`/topics/${topicId}`);
}

export async function deleteTopic(topicId: string) {
  const session = await requireRole(["ADMIN"]);
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  await prisma.topic.delete({ where: { id: topicId } }); // cascades to Blog, QAItem, TopicMembership per schema

  await logActivity({
    action: "TOPIC_DELETED",
    actorId: (session.user as any).id,
    actorEmail: session.user?.email,
    targetType: "Topic",
    targetId: topicId,
    metadata: { title: topic?.title },
  });

  revalidatePath("/topics");
  revalidatePath("/");
}

// ---------- Blog comments ----------

export async function postComment(blogId: string, formData: FormData) {
  const session = await requireSession();
  const userId = (session.user as any).id as string;
  const body = String(formData.get("body") || "").trim();
  if (!body) throw new Error("Comment cannot be empty");

  const comment = await prisma.comment.create({ data: { blogId, authorId: userId, body } });

  await logActivity({
    action: "COMMENT_POSTED",
    actorId: userId,
    actorEmail: session.user?.email,
    targetType: "Comment",
    targetId: comment.id,
    metadata: { blogId },
  });

  revalidatePath(`/blogs/${blogId}`);
}

export async function deleteComment(blogId: string, commentId: string) {
  const session = await requireRole(["TOPIC_OWNER", "ADMIN"]);
  await prisma.comment.delete({ where: { id: commentId } });

  await logActivity({
    action: "COMMENT_DELETED",
    actorId: (session.user as any).id,
    actorEmail: session.user?.email,
    targetType: "Comment",
    targetId: commentId,
    metadata: { blogId },
  });

  revalidatePath(`/blogs/${blogId}`);
}

// ---------- Submit (new Topic or new Blog) ----------

export async function submitContent(formData: FormData) {
  const session = await requireSession();
  const userId = (session.user as any).id as string;

  const kind = formData.get("kind") === "blog" ? "blog" : "topic";
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  if (!title) throw new Error("Title is required");

  if (kind === "topic") {
    const topic = await prisma.topic.create({ data: { title, description: content } });
    await logActivity({
      action: "TOPIC_CREATED",
      actorId: userId,
      actorEmail: session.user?.email,
      targetType: "Topic",
      targetId: topic.id,
      metadata: { title },
    });
    revalidatePath("/topics");
    return { redirectTo: `/topics/${topic.id}` };
  } else {
    const categoryTitle = String(formData.get("category") || "").trim();
    let topic = categoryTitle
      ? await prisma.topic.findFirst({ where: { title: { equals: categoryTitle, mode: "insensitive" } } })
      : null;
    if (!topic) topic = await prisma.topic.findFirst({ orderBy: { createdAt: "asc" } });
    if (!topic) throw new Error("Create a topic first before publishing a blog");

    const blog = await prisma.blog.create({
      data: { title, body: content || "...", topicId: topic.id, authorId: userId },
    });
    await logActivity({
      action: "BLOG_PUBLISHED",
      actorId: userId,
      actorEmail: session.user?.email,
      targetType: "Blog",
      targetId: blog.id,
      metadata: { title, topicId: topic.id },
    });
    revalidatePath("/");
    return { redirectTo: `/blogs/${blog.id}` };
  }
}

// ---------- Portfolio (owner-only writes; owner = ADMIN in this v1 model) ----------

export async function updateProfile(formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const linkedinUrl = String(formData.get("linkedinUrl") || "").trim();
  const githubUrl = String(formData.get("githubUrl") || "").trim();
  const certifications = String(formData.get("certifications") || "").trim();

  const existing = await prisma.portfolioProfile.findFirst();
  if (existing) {
    await prisma.portfolioProfile.update({ where: { id: existing.id }, data: { linkedinUrl, githubUrl, certifications } });
  } else {
    await prisma.portfolioProfile.create({ data: { linkedinUrl, githubUrl, certifications } });
  }

  await logActivity({
    action: "PROFILE_UPDATED",
    actorId: (session.user as any).id,
    actorEmail: session.user?.email,
    targetType: "PortfolioProfile",
  });

  revalidatePath("/portfolio");
}

export async function uploadDocument(formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const userId = (session.user as any).id as string;
  const docType = String(formData.get("docType") || "RESUME") as "RESUME" | "COVER_LETTER" | "PORTFOLIO";
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Choose a PDF file first");

  const path = `documents/${docType.toLowerCase()}-${Date.now()}.pdf`;
  const fileUrl = await uploadPdf(file, path);

  // One active file per type — replace whatever was there before.
  await prisma.portfolioDocument.deleteMany({ where: { ownerId: userId, type: docType } });
  const doc = await prisma.portfolioDocument.create({
    data: { ownerId: userId, type: docType, fileUrl, fileFormat: "pdf" },
  });

  await logActivity({
    action: "DOCUMENT_UPLOADED",
    actorId: userId,
    actorEmail: session.user?.email,
    targetType: "PortfolioDocument",
    targetId: doc.id,
    metadata: { docType },
  });

  revalidatePath("/portfolio");
}

export async function addProject(formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const userId = (session.user as any).id as string;
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!title) throw new Error("Title is required");

  const laptopFile = formData.get("screenshotLaptop") as File | null;
  const mobileFile = formData.get("screenshotMobile") as File | null;
  const stamp = Date.now();

  let screenshotLaptopUrl: string | undefined;
  let screenshotMobileUrl: string | undefined;
  if (laptopFile && laptopFile.size > 0) {
    screenshotLaptopUrl = await uploadJpeg(laptopFile, `projects/${stamp}-laptop.jpg`);
  }
  if (mobileFile && mobileFile.size > 0) {
    screenshotMobileUrl = await uploadJpeg(mobileFile, `projects/${stamp}-mobile.jpg`);
  }

  const project = await prisma.portfolioProject.create({
    data: { ownerId: userId, title, description, screenshotLaptopUrl, screenshotMobileUrl },
  });

  await logActivity({
    action: "PROJECT_ADDED",
    actorId: userId,
    actorEmail: session.user?.email,
    targetType: "PortfolioProject",
    targetId: project.id,
    metadata: { title },
  });

  revalidatePath("/portfolio");
}

export async function updateProject(projectId: string, formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!title) throw new Error("Title is required");

  const laptopFile = formData.get("screenshotLaptop") as File | null;
  const mobileFile = formData.get("screenshotMobile") as File | null;
  const stamp = Date.now();

  const data: any = { title, description };
  // Only replace a screenshot if a new file was actually chosen — otherwise
  // the existing image stays untouched.
  if (laptopFile && laptopFile.size > 0) {
    data.screenshotLaptopUrl = await uploadJpeg(laptopFile, `projects/${stamp}-laptop.jpg`);
  }
  if (mobileFile && mobileFile.size > 0) {
    data.screenshotMobileUrl = await uploadJpeg(mobileFile, `projects/${stamp}-mobile.jpg`);
  }

  await prisma.portfolioProject.update({ where: { id: projectId }, data });

  await logActivity({
    action: "PROJECT_UPDATED",
    actorId: (session.user as any).id,
    actorEmail: session.user?.email,
    targetType: "PortfolioProject",
    targetId: projectId,
    metadata: { title },
  });

  revalidatePath("/portfolio");
}

export async function removeProject(projectId: string) {
  const session = await requireRole(["ADMIN"]);
  await prisma.portfolioProject.delete({ where: { id: projectId } });

  await logActivity({
    action: "PROJECT_REMOVED",
    actorId: (session.user as any).id,
    actorEmail: session.user?.email,
    targetType: "PortfolioProject",
    targetId: projectId,
  });

  revalidatePath("/portfolio");
}

export async function removeDocument(docId: string) {
  const session = await requireRole(["ADMIN"]);
  await prisma.portfolioDocument.delete({ where: { id: docId } });

  await logActivity({
    action: "DOCUMENT_REMOVED",
    actorId: (session.user as any).id,
    actorEmail: session.user?.email,
    targetType: "PortfolioDocument",
    targetId: docId,
  });

  revalidatePath("/portfolio");
}

// ---------- Admin moderation ----------

export async function resolveReport(reportId: string, action: "APPROVED" | "REMOVED") {
  const session = await requireRole(["ADMIN"]);
  await prisma.report.update({
    where: { id: reportId },
    data: { status: action, reviewedById: (session.user as any).id },
  });

  await logActivity({
    action: action === "APPROVED" ? "REPORT_APPROVED" : "REPORT_REMOVED",
    actorId: (session.user as any).id,
    actorEmail: session.user?.email,
    targetType: "Report",
    targetId: reportId,
  });

  revalidatePath("/admin");
}

export async function addAdvertisement(formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const imageUrl = String(formData.get("imageUrl") || "").trim() || "/placeholder-ad.jpg";
  const targetUrl = String(formData.get("targetUrl") || "").trim();
  const placement = String(formData.get("placement") || "LEADERBOARD") as any;
  if (!targetUrl) throw new Error("Target URL is required");

  const ad = await prisma.advertisement.create({ data: { imageUrl, targetUrl, placement } });

  await logActivity({
    action: "AD_ADDED",
    actorId: (session.user as any).id,
    actorEmail: session.user?.email,
    targetType: "Advertisement",
    targetId: ad.id,
    metadata: { placement, targetUrl },
  });

  revalidatePath("/admin");
}

export async function removeAdvertisement(adId: string) {
  const session = await requireRole(["ADMIN"]);
  await prisma.advertisement.delete({ where: { id: adId } });

  await logActivity({
    action: "AD_REMOVED",
    actorId: (session.user as any).id,
    actorEmail: session.user?.email,
    targetType: "Advertisement",
    targetId: adId,
  });

  revalidatePath("/admin");
}

// ---------- Roadmap ("Upcoming Updates") ----------

export async function addRoadmapItem(formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const title = String(formData.get("title") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const status = String(formData.get("status") || "PLANNED") as any;
  const targetDateStr = String(formData.get("targetDate") || "").trim();
  const targetDate = targetDateStr ? new Date(targetDateStr) : null;
  if (!title) throw new Error("Title is required");

  const item = await prisma.roadmapItem.create({ data: { title, notes, status, targetDate } });

  await logActivity({
    action: "ROADMAP_ITEM_ADDED",
    actorId: (session.user as any).id,
    actorEmail: session.user?.email,
    targetType: "RoadmapItem",
    targetId: item.id,
    metadata: { title, status },
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function setRoadmapStatus(itemId: string, status: "PLANNED" | "IN_PROGRESS" | "DONE") {
  const session = await requireRole(["ADMIN"]);
  await prisma.roadmapItem.update({ where: { id: itemId }, data: { status } });

  await logActivity({
    action: "ROADMAP_STATUS_CHANGED",
    actorId: (session.user as any).id,
    actorEmail: session.user?.email,
    targetType: "RoadmapItem",
    targetId: itemId,
    metadata: { status },
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function removeRoadmapItem(itemId: string) {
  const session = await requireRole(["ADMIN"]);
  await prisma.roadmapItem.delete({ where: { id: itemId } });

  await logActivity({
    action: "ROADMAP_ITEM_REMOVED",
    actorId: (session.user as any).id,
    actorEmail: session.user?.email,
    targetType: "RoadmapItem",
    targetId: itemId,
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

// ---------- Audit log management ----------

export async function clearAuditLogsBefore(dateStr: string) {
  const session = await requireRole(["ADMIN"]);
  const cutoff = new Date(dateStr);
  if (isNaN(cutoff.getTime())) throw new Error("Invalid date");

  const result = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });

  // Logged after the fact, so this action itself remains in the trail.
  await logActivity({
    action: "AUDIT_LOG_CLEARED",
    actorId: (session.user as any).id,
    actorEmail: session.user?.email,
    metadata: { before: dateStr, deletedCount: result.count },
  });

  revalidatePath("/admin");
}

export async function clearAllAuditLogs() {
  const session = await requireRole(["ADMIN"]);
  const result = await prisma.auditLog.deleteMany({});

  await logActivity({
    action: "AUDIT_LOG_CLEARED_ALL",
    actorId: (session.user as any).id,
    actorEmail: session.user?.email,
    metadata: { deletedCount: result.count },
  });

  revalidatePath("/admin");
}
