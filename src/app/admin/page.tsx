import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/prisma";
import { getSessionOrNull } from "@/lib/guards";
import { resolveReport, addAdvertisement, removeAdvertisement } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSessionOrNull();
  const role = (session?.user as any)?.role;

  if (role !== "ADMIN") {
    return (
      <>
        <Nav />
        <main><p className="muted">Admin only. Sign in with the site owner account to view this page.</p></main>
      </>
    );
  }

  const [reports, ads] = await Promise.all([
    prisma.report.findMany({ where: { status: "OPEN" }, include: { reporter: true } }),
    prisma.advertisement.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <>
      <Nav />
      <main>
        <h1>Admin moderation</h1>

        <h2>Flagged content queue</h2>
        {reports.length === 0 && <p className="muted">Queue is clear.</p>}
        {reports.map((r: any) => (
          <div className="card" key={r.id}>
            <b>{r.targetType} reported</b> — target id {r.targetId}
            <p className="muted">Reporter: {r.reporter?.name ?? "Unknown"} · Reason: {r.reason ?? "—"}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <form action={resolveReport.bind(null, r.id, "APPROVED")}>
                <button className="btn" type="submit">Approve</button>
              </form>
              <form action={resolveReport.bind(null, r.id, "REMOVED")}>
                <button className="btn" type="submit">Remove</button>
              </form>
            </div>
          </div>
        ))}

        <h2>Advertisement manager</h2>
        {ads.map((a: any) => (
          <div className="card" key={a.id}>
            <b>{a.placement}</b> → {a.targetUrl} · {a.status}
            <form action={removeAdvertisement.bind(null, a.id)}>
              <button className="btn" type="submit">Remove</button>
            </form>
          </div>
        ))}
        <div className="card">
          <h3>Upload new advertisement</h3>
          <form action={addAdvertisement}>
            <input name="targetUrl" placeholder="Target URL" style={{ width: "100%", padding: 8, marginBottom: 8 }} required />
            <select name="placement" defaultValue="LEADERBOARD" style={{ width: "100%", padding: 8, marginBottom: 8 }}>
              <option value="LEADERBOARD">Leaderboard (home top)</option>
              <option value="IN_FEED">In-feed</option>
              <option value="MID_ARTICLE">Mid-article</option>
              <option value="SIDEBAR">Sidebar</option>
            </select>
            <p className="muted" style={{ fontSize: 11 }}>Creative image upload (JPEG) connects once Supabase Storage is wired in.</p>
            <button className="btn primary" type="submit">Add advertisement</button>
          </form>
        </div>
      </main>
    </>
  );
}
