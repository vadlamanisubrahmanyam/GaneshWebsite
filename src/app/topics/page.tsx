import Link from "next/link";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
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
        <h1>Topics</h1>
        <p className="muted">Community-run discussion spaces — questions, reviews, and blog posts by category.</p>

        {topics.length === 0 && <p className="muted">No topics yet. Sign in and use Submit to create the first one.</p>}
        {topics.map((t: any) => (
          <Link key={t.id} href={`/topics/${t.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card">
              <h3>{t.title}</h3>
              <p className="muted">{t.description}</p>
              <p className="muted">{t.followerCount} followers</p>
            </div>
          </Link>
        ))}
      </main>
    </>
  );
}
