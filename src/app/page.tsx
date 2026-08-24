import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionOrNull } from "@/lib/guards";
import { Nav } from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSessionOrNull();

  let topics: Awaited<ReturnType<typeof prisma.topic.findMany>> = [];
  let blogs: any[] = [];
  try {
    [topics, blogs] = await Promise.all([
      prisma.topic.findMany({ take: 6, orderBy: { createdAt: "desc" } }),
      prisma.blog.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { author: true, topic: true },
      }),
    ]);
  } catch (err) {
    console.error("DB not reachable yet:", err);
  }

  return (
    <>
      <Nav />
      <main>
        <h1>Latest from the community</h1>
        <p className="muted">
          {session
            ? `Signed in as ${session.user?.email} (${(session.user as any)?.role ?? "USER"})`
            : "Sign in to post, comment, and ask questions."}
        </p>

        <h2>Trending topics</h2>
        {topics.length === 0 && <p className="muted">No topics yet — create one via Submit.</p>}
        {topics.map((t: any) => (
          <Link key={t.id} href={`/topics/${t.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card">
              <h3>{t.title}</h3>
              <p className="muted">{t.description}</p>
            </div>
          </Link>
        ))}

        <h2>Latest blogs</h2>
        {blogs.length === 0 && <p className="muted">No blogs yet.</p>}
        {blogs.map((b: any) => (
          <Link key={b.id} href={`/blogs/${b.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card">
              <h3>{b.title}</h3>
              <p className="muted">
                by {b.author?.name ?? "Unknown"} · Topic: {b.topic?.title}
              </p>
            </div>
          </Link>
        ))}
      </main>
    </>
  );
}
