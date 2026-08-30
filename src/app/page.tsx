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

  let roadmapItems: any[] = [];
  try {
    roadmapItems = await prisma.roadmapItem.findMany({ orderBy: { sortOrder: "asc" }, take: 12 });
  } catch (err) {
    console.error(err);
  }

  const STATUS_LABEL: Record<string, string> = { PLANNED: "Planned", IN_PROGRESS: "In progress", DONE: "Done" };

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
        <div className="home-grid">
          <div className="home-main">
            <h1>{firstName ? `Welcome back, ${firstName}` : "Welcome to Subrahmanyam's community site"}</h1>
            <p className="muted">
              {session
                ? "Here's what's new since you last checked in."
                : "Browse topics, blogs, and my project portfolio — sign in to join the discussion."}
            </p>
          </div>

          <aside className="home-aside">
            <div className="card home-aside-sticky">
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Upcoming updates</h3>
              {roadmapItems.length === 0 && <p className="muted" style={{ fontSize: 12 }}>Nothing planned right now.</p>}
              {roadmapItems.length > 0 && (
                <div className="scroll-box" style={{ maxHeight: 320 }}>
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                    <tbody>
                      {roadmapItems.map((r: any) => (
                        <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                          <td style={{ padding: "5px 4px 5px 0" }}>
                            {r.title}
                            {r.targetDate && (
                              <div className="muted" style={{ fontSize: 10 }}>
                                {new Date(r.targetDate).toLocaleDateString()}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "5px 0", textAlign: "right", whiteSpace: "nowrap", verticalAlign: "top" }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                padding: "2px 6px",
                                borderRadius: 10,
                                background: r.status === "DONE" ? "#e6f4ea" : r.status === "IN_PROGRESS" ? "var(--gold-soft)" : "#EEF0F5",
                                color: r.status === "DONE" ? "#1e7a34" : r.status === "IN_PROGRESS" ? "#6b5511" : "var(--muted)",
                              }}
                            >
                              {STATUS_LABEL[r.status] ?? r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </aside>
        </div>

        <h2 className="compact-heading">Top headlines</h2>
        <div className="scroll-box compact-list" style={{ maxHeight: 260 }}>
          {headlines.length === 0 && <p className="muted">Headlines unavailable right now.</p>}
          {headlines.map((h, i) => (
            <a key={i} href={h.link} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="card">
                <h3>{h.title}</h3>
                {h.source && <p className="muted">{h.source}</p>}
              </div>
            </a>
          ))}
        </div>

        <h2 className="compact-heading">Latest activity</h2>
        <div className="scroll-box compact-list" style={{ maxHeight: 260 }}>
          {activity.length === 0 && <p className="muted">Nothing posted yet — be the first.</p>}
          {activity.map((item) => (
            <Link
              key={`${item.kind}-${item.id}`}
              href={item.kind === "blog" ? `/blogs/${item.id}` : `/topics/${item.topic?.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="card">
                <span className="muted" style={{ fontSize: 10, textTransform: "uppercase" }}>
                  {item.kind === "blog" ? "Blog post" : item.qaType === "REVIEW" ? "Review" : "Question"}
                </span>
                <h3>{item.title}</h3>
                <p className="muted">by {item.author?.name ?? "Unknown"} · Topic: {item.topic?.title}</p>
              </div>
            </Link>
          ))}
        </div>

        <h2 className="compact-heading">Trending topics</h2>
        <div className="scroll-box compact-list" style={{ maxHeight: 260 }}>
          {topics.length === 0 && <p className="muted">No topics yet — create one via + New Post.</p>}
          {topics.map((t: any) => (
            <Link key={t.id} href={`/topics/${t.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="card">
                <h3>{t.title}</h3>
                <p className="muted">{t.description}</p>
              </div>
            </Link>
          ))}
        </div>

        <p className="muted" style={{ marginTop: 16 }}>
          <Link href="/blogs">Browse all blogs →</Link> &nbsp;·&nbsp; <Link href="/topics">Browse all topics →</Link>
        </p>
      </main>
    </>
  );
}
