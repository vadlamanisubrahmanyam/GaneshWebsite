import Link from "next/link";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/prisma";
import { getSessionOrNull } from "@/lib/guards";
import { deleteTopic } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const session = await getSessionOrNull();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  let topics: Awaited<ReturnType<typeof prisma.topic.findMany>> = [];
  try {
    topics = await prisma.topic.findMany({ orderBy: { createdAt: "desc" } });
  } catch (err) {
    console.error(err);
  }

  return (
    <>
      <Nav />
      <main>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>Topics</h1>
            <p className="muted">Community-run discussion spaces — questions, reviews, and blog posts by category.</p>
          </div>
          <a href="/submit?kind=topic" className="btn primary">+ New Topic</a>
        </div>

        {topics.length === 0 && <p className="muted">No topics yet. Sign in and use Submit to create the first one.</p>}
        {topics.map((t: any) => (
          <div className="card" key={t.id}>
            <Link href={`/topics/${t.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <h3>{t.title}</h3>
              <p className="muted">{t.description}</p>
              <p className="muted">{t.followerCount} followers</p>
            </Link>
            {isAdmin && (
              <form action={deleteTopic.bind(null, t.id)} style={{ marginTop: 8 }}>
                <button className="btn small danger" type="submit">Delete topic</button>
              </form>
            )}
          </div>
        ))}
      </main>
    </>
  );
}
