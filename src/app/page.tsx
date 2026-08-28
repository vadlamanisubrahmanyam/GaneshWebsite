import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionOrNull } from "@/lib/guards";
import { getTopHeadlines } from "@/lib/news";
import { Nav } from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSessionOrNull();
  const firstName = session?.user?.name?.split(" ")[0];

  let topics: any[] = [];
  let blogs: any[] = [];
  let qaItems: any[] = [];
  try {
    [topics, blogs, qaItems] = await Promise.all([
      prisma.topic.findMany({ take: 6, orderBy: { createdAt: "desc" } }),
      prisma.blog.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { author: true, topic: true },
      }),
      prisma.qAItem.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { author: true, topic: true },
      }),
    ]);
  } catch (err) {
    console.error("DB not reachable yet:", err);
  }

  const headlines = await getTopHeadlines(6);

  // Merge blogs + Q&A into one "latest activity" feed, newest first.
  const activity = [
    ...blogs.map((b: any) => ({ kind: "blog" as const, id: b.id, title: b.title, topic: b.topic, author: b.author, createdAt: b.createdAt })),
    ...qaItems.map((q: any) => ({ kind: "qa" as const, id: q.id, title: q.title, topic: q.topic, author: q.author, createdAt: q.createdAt, qaType: q.type })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <>
      <Nav />
      <main>
        <h1>{firstName ? `Welcome back, ${firstName}` : "Welcome to Subrahmanyam's community site"}</h1>
        <p className="muted">
          {session
            ? "Here's what's new since you last checked in."
            : "Browse topics, blogs, and my project portfolio — sign in to join the discussion."}
        </p>

        <h2>Top headlines</h2>
        {headlines.length === 0 && <p className="muted">Headlines unavailable right now.</p>}
        {headlines.map((h, i) => (
          <a key={i} href={h.link} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card">
              <h3 style={{ fontSize: 16 }}>{h.title}</h3>
              {h.source && <p className="muted">{h.source}</p>}
            </div>
          </a>
        ))}

        <h2>Latest activity</h2>
        {activity.length === 0 && <p className="muted">Nothing posted yet — be the first.</p>}
        {activity.map((item) => (
          <Link
            key={`${item.kind}-${item.id}`}
            href={item.kind === "blog" ? `/blogs/${item.id}` : `/topics/${item.topic?.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="card">
              <span className="muted" style={{ fontSize: 11, textTransform: "uppercase" }}>
                {item.kind === "blog" ? "Blog post" : item.qaType === "REVIEW" ? "Review" : "Question"}
              </span>
              <h3 style={{ margin: "4px 0" }}>{item.title}</h3>
              <p className="muted">by {item.author?.name ?? "Unknown"} · Topic: {item.topic?.title}</p>
            </div>
          </Link>
        ))}

        <h2>Trending topics</h2>
        {topics.length === 0 && <p className="muted">No topics yet — create one via + New Post.</p>}
        {topics.map((t: any) => (
          <Link key={t.id} href={`/topics/${t.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card">
              <h3>{t.title}</h3>
              <p className="muted">{t.description}</p>
            </div>
          </Link>
        ))}

        <p className="muted" style={{ marginTop: 20 }}>
          <Link href="/blogs">Browse all blogs →</Link> &nbsp;·&nbsp; <Link href="/topics">Browse all topics →</Link>
        </p>
      </main>
    </>
  );
}
