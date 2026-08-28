import Link from "next/link";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/prisma";
import { getSessionOrNull } from "@/lib/guards";
import { postQaItem, deleteQaItem } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function TopicDetailPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const session = await getSessionOrNull();
  const role = (session?.user as any)?.role ?? null;
  const canModerate = role === "TOPIC_OWNER" || role === "ADMIN";

  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) {
    return (
      <>
        <Nav />
        <main><p className="muted">Topic not found.</p></main>
      </>
    );
  }

  const items = await prisma.qAItem.findMany({
    where: { topicId: topic.id },
    orderBy: { createdAt: "desc" },
    include: { author: true },
  });
  const topicBlogs = await prisma.blog.findMany({
    where: { topicId: topic.id },
    orderBy: { createdAt: "desc" },
    include: { author: true },
  });

  const postQaWithTopic = postQaItem.bind(null, topic.id);

  return (
    <>
      <Nav />
      <main>
        <p className="muted"><Link href="/topics">← All topics</Link></p>
        <h1>{topic.title}</h1>
        <p className="muted">{topic.description} · {topic.followerCount} followers</p>

        <div className="card">
          <h3>{session ? "Ask a question or post a review" : "Sign in to ask a question or post a review"}</h3>
          {session ? (
            <form action={postQaWithTopic}>
              <div style={{ marginBottom: 10 }}>
                <label className="muted">Type&nbsp;</label>
                <select name="type" defaultValue="question">
                  <option value="question">Question</option>
                  <option value="review">Review</option>
                </select>
                <label className="muted" style={{ marginLeft: 14 }}>Rating (reviews only)&nbsp;</label>
                <select name="rating" defaultValue="5">
                  <option>5</option><option>4</option><option>3</option><option>2</option><option>1</option>
                </select>
              </div>
              <input name="title" placeholder="Title" style={{ width: "100%", padding: 8, marginBottom: 8 }} required />
              <textarea name="body" placeholder="Details..." rows={3} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
              <button className="btn primary" type="submit">Post</button>
            </form>
          ) : null}
        </div>

        {session && (
          <p className="muted" style={{ marginBottom: 20 }}>
            Want to write a full article instead?{" "}
            <a href={`/submit?kind=blog&category=${encodeURIComponent(topic.title)}`}>Write a blog post in {topic.title} →</a>
          </p>
        )}

        <h2>Blog posts in {topic.title}</h2>
        {topicBlogs.length === 0 && <p className="muted">No blog posts in this topic yet.</p>}
        {topicBlogs.map((b: any) => (
          <Link key={b.id} href={`/blogs/${b.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card">
              <h3>{b.title}</h3>
              <p className="muted">by {b.author?.name ?? "Unknown"}</p>
            </div>
          </Link>
        ))}

        <h2>Questions &amp; Reviews</h2>

        {items.length === 0 && <p className="muted">No questions or reviews yet.</p>}
        {items.map((q: any) => (
          <div className="card" key={q.id}>
            <span className="muted" style={{ fontSize: 11, textTransform: "uppercase" }}>{q.type}</span>
            <h3 style={{ margin: "4px 0" }}>{q.title}</h3>
            {q.type === "REVIEW" && q.rating && <div>{"★".repeat(q.rating)}{"☆".repeat(5 - q.rating)}</div>}
            {q.body && <p>{q.body}</p>}
            <p className="muted">by {q.author?.name ?? "Unknown"}</p>
            {canModerate && (
              <form action={deleteQaItem.bind(null, topic.id, q.id)}>
                <button className="btn" type="submit">Delete</button>
              </form>
            )}
          </div>
        ))}
      </main>
    </>
  );
}
