import Link from "next/link";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BlogsPage() {
  let blogs: any[] = [];
  try {
    blogs = await prisma.blog.findMany({
      orderBy: { createdAt: "desc" },
      include: { author: true, topic: true },
    });
  } catch (err) {
    console.error(err);
  }

  return (
    <>
      <Nav />
      <main>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>Blogs</h1>
            <p className="muted">Every article published on the site, newest first.</p>
          </div>
          <a href="/submit?kind=blog" className="btn primary">+ Write a post</a>
        </div>

        {blogs.length === 0 && <p className="muted">No blogs published yet.</p>}
        {blogs.map((b: any) => (
          <Link key={b.id} href={`/blogs/${b.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card">
              <h3>{b.title}</h3>
              <p className="muted">by {b.author?.name ?? "Unknown"} · Topic: {b.topic?.title}</p>
            </div>
          </Link>
        ))}
      </main>
    </>
  );
}
