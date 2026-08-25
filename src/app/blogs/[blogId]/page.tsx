import Link from "next/link";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/prisma";
import { getSessionOrNull } from "@/lib/guards";
import { postComment, deleteComment } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function BlogDetailPage({ params }: { params: Promise<{ blogId: string }> }) {
  const { blogId } = await params;
  const session = await getSessionOrNull();
  const role = (session?.user as any)?.role ?? null;
  const canModerate = role === "TOPIC_OWNER" || role === "ADMIN";

  const blog = await prisma.blog.findUnique({
    where: { id: blogId },
    include: { author: true, topic: true, comments: { include: { author: true }, orderBy: { createdAt: "desc" } } },
  });

  if (!blog) {
    return (
      <>
        <Nav />
        <main><p className="muted">Blog not found.</p></main>
      </>
    );
  }

  const postCommentWithBlog = postComment.bind(null, blog.id);

  return (
    <>
      <Nav />
      <main>
        <p className="muted"><Link href="/">← Back to feed</Link></p>
        <h1>{blog.title}</h1>
        <p className="muted">by {blog.author?.name ?? "Unknown"} · Topic: {blog.topic?.title}</p>

        <div className="card">
          <p>{blog.body}</p>
        </div>

        <h2>Comments ({blog.comments.length})</h2>
        <div className="card">
          {session ? (
            <form action={postCommentWithBlog}>
              <textarea name="body" placeholder="Add a comment..." rows={2} style={{ width: "100%", padding: 8, marginBottom: 8 }} required />
              <button className="btn primary" type="submit">Post comment</button>
            </form>
          ) : (
            <p className="muted">Sign in to comment.</p>
          )}
        </div>

        {blog.comments.length === 0 && <p className="muted">No comments yet.</p>}
        {blog.comments.map((c: any) => (
          <div className="card" key={c.id}>
            <b>{c.author?.name ?? "Unknown"}</b>
            <p>{c.body}</p>
            {canModerate && (
              <form action={deleteComment.bind(null, blog.id, c.id)}>
                <button className="btn" type="submit">Delete</button>
              </form>
            )}
          </div>
        ))}
      </main>
    </>
  );
}
