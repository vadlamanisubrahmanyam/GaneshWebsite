"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/guards";

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

  await prisma.qAItem.create({
    data: { topicId, authorId: userId, type, title, body, rating },
  });

  revalidatePath(`/topics/${topicId}`);
}

export async function deleteQaItem(topicId: string, qaItemId: string) {
  // Only Topic Owners or Admins can delete others' Q&A/reviews.
  await requireRole(["TOPIC_OWNER", "ADMIN"]);
  await prisma.qAItem.delete({ where: { id: qaItemId } });
  revalidatePath(`/topics/${topicId}`);
}

// ---------- Blog comments ----------

export async function postComment(blogId: string, formData: FormData) {
  const session = await requireSession();
  const userId = (session.user as any).id as string;
  const body = String(formData.get("body") || "").trim();
  if (!body) throw new Error("Comment cannot be empty");

  await prisma.comment.create({ data: { blogId, authorId: userId, body } });
  revalidatePath(`/blogs/${blogId}`);
}

export async function deleteComment(blogId: string, commentId: string) {
  await requireRole(["TOPIC_OWNER", "ADMIN"]);
  await prisma.comment.delete({ where: { id: commentId } });
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
    revalidatePath("/");
    return { redirectTo: `/blogs/${blog.id}` };
  }
}

// ---------- Portfolio (owner-only writes; owner = ADMIN in this v1 model) ----------

export async function updateProfile(formData: FormData) {
  await requireRole(["ADMIN"]);
  const linkedinUrl = String(formData.get("linkedinUrl") || "").trim();
  const githubUrl = String(formData.get("githubUrl") || "").trim();
  const certifications = String(formData.get("certifications") || "").trim();

  const existing = await prisma.portfolioProfile.findFirst();
  if (existing) {
    await prisma.portfolioProfile.update({ where: { id: existing.id }, data: { linkedinUrl, githubUrl, certifications } });
  } else {
    await prisma.portfolioProfile.create({ data: { linkedinUrl, githubUrl, certifications } });
  }
  revalidatePath("/portfolio");
}

export async function addProject(formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const userId = (session.user as any).id as string;
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!title) throw new Error("Title is required");

  await prisma.portfolioProject.create({ data: { ownerId: userId, title, description } });
  revalidatePath("/portfolio");
}

export async function removeProject(projectId: string) {
  await requireRole(["ADMIN"]);
  await prisma.portfolioProject.delete({ where: { id: projectId } });
  revalidatePath("/portfolio");
}

export async function removeDocument(docId: string) {
  await requireRole(["ADMIN"]);
  await prisma.portfolioDocument.delete({ where: { id: docId } });
  revalidatePath("/portfolio");
}

// ---------- Admin moderation ----------

export async function resolveReport(reportId: string, action: "APPROVED" | "REMOVED") {
  await requireRole(["ADMIN"]);
  const session = await requireSession();
  await prisma.report.update({
    where: { id: reportId },
    data: { status: action, reviewedById: (session.user as any).id },
  });
  revalidatePath("/admin");
}

export async function addAdvertisement(formData: FormData) {
  await requireRole(["ADMIN"]);
  const imageUrl = String(formData.get("imageUrl") || "").trim() || "/placeholder-ad.jpg";
  const targetUrl = String(formData.get("targetUrl") || "").trim();
  const placement = String(formData.get("placement") || "LEADERBOARD") as any;
  if (!targetUrl) throw new Error("Target URL is required");

  await prisma.advertisement.create({ data: { imageUrl, targetUrl, placement } });
  revalidatePath("/admin");
}

export async function removeAdvertisement(adId: string) {
  await requireRole(["ADMIN"]);
  await prisma.advertisement.delete({ where: { id: adId } });
  revalidatePath("/admin");
}
