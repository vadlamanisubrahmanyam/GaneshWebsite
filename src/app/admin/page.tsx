import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/prisma";
import { getSessionOrNull } from "@/lib/guards";
import { resolveReport, addAdvertisement, removeAdvertisement, addRoadmapItem, setRoadmapStatus, removeRoadmapItem, clearAuditLogsBefore, clearAllAuditLogs } from "@/lib/actions";

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

  const [reports, ads, roadmapItems, logs, logCount] = await Promise.all([
    prisma.report.findMany({ where: { status: "OPEN" }, include: { reporter: true } }),
    prisma.advertisement.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.roadmapItem.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.auditLog.count(),
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

        <h2>Upcoming updates (shown on the home page)</h2>
        {roadmapItems.length === 0 && <p className="muted">No roadmap items yet.</p>}
        {roadmapItems.map((r: any) => (
          <div className="card" key={r.id}>
            <b>{r.title}</b>
            {r.notes && <p className="muted">{r.notes}</p>}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
              <form action={async (fd: FormData) => { "use server"; await setRoadmapStatus(r.id, fd.get("status") as any); }} style={{ display: "flex", gap: 6 }}>
                <select name="status" defaultValue={r.status} style={{ padding: 6 }}>
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="DONE">Done</option>
                </select>
                <button className="btn small" type="submit">Update</button>
              </form>
              <form action={removeRoadmapItem.bind(null, r.id)}>
                <button className="btn small" type="submit">Delete</button>
              </form>
            </div>
          </div>
        ))}
        <div className="card">
          <h3>Add roadmap item</h3>
          <form action={addRoadmapItem}>
            <input name="title" placeholder="e.g. Microsoft login integration" style={{ width: "100%", padding: 8, marginBottom: 8 }} required />
            <textarea name="notes" placeholder="Optional notes" rows={2} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
            <select name="status" defaultValue="PLANNED" style={{ width: "100%", padding: 8, marginBottom: 8 }}>
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="DONE">Done</option>
            </select>
            <button className="btn primary" type="submit">Add to roadmap</button>
          </form>
        </div>

        <h2>Activity log ({logCount} total{logCount > 50 ? ", showing latest 50" : ""})</h2>
        {logs.length === 0 && <p className="muted">No activity recorded yet.</p>}
        {logs.length > 0 && (
          <table className="utable" style={{ marginBottom: 16 }}>
            <tbody>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>By</th>
                <th>Target</th>
              </tr>
              {logs.map((l: any) => (
                <tr key={l.id}>
                  <td>{new Date(l.createdAt).toLocaleString()}</td>
                  <td>{l.action}</td>
                  <td>{l.actorEmail ?? "system"}</td>
                  <td>{l.targetType ? `${l.targetType}${l.targetId ? " · " + l.targetId.slice(0, 8) : ""}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="card">
          <h3>Clear activity log</h3>
          <form action={async (fd: FormData) => { "use server"; await clearAuditLogsBefore(String(fd.get("before"))); }}>
            <label className="muted" style={{ fontSize: 11 }}>Delete entries logged before this date</label>
            <input type="date" name="before" required style={{ display: "block", padding: 8, margin: "6px 0 10px" }} />
            <button className="btn" type="submit">Clear entries before date</button>
          </form>
          <form action={clearAllAuditLogs} style={{ marginTop: 10 }}>
            <button className="btn danger" type="submit">Clear entire log</button>
          </form>
        </div>
      </main>
    </>
  );
}
