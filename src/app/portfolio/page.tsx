import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/prisma";
import { getSessionOrNull } from "@/lib/guards";
import { updateProfile, addProject, removeProject, removeDocument } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const session = await getSessionOrNull();
  const isOwner = (session?.user as any)?.role === "ADMIN";

  const [profile, projects, docs] = await Promise.all([
    prisma.portfolioProfile.findFirst(),
    prisma.portfolioProject.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.portfolioDocument.findMany(),
  ]);

  return (
    <>
      <Nav />
      <main>
        <h1>My Portfolio</h1>
        <p className="muted">{isOwner ? "Owner view — you can edit everything below." : "Public view — read-only."}</p>

        <div className="card">
          <h3>Profile</h3>
          <p className="muted">LinkedIn: {profile?.linkedinUrl || "—"}</p>
          <p className="muted">GitHub: {profile?.githubUrl || "—"}</p>
          <p className="muted">Certifications: {profile?.certifications || "—"}</p>

          {isOwner && (
            <form action={updateProfile} style={{ marginTop: 12 }}>
              <input name="linkedinUrl" placeholder="LinkedIn URL" defaultValue={profile?.linkedinUrl ?? ""} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
              <input name="githubUrl" placeholder="GitHub URL" defaultValue={profile?.githubUrl ?? ""} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
              <input name="certifications" placeholder="Certificate credentials" defaultValue={profile?.certifications ?? ""} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
              <button className="btn primary" type="submit">Save profile</button>
            </form>
          )}
        </div>

        <h2>Documents</h2>
        {docs.length === 0 && <p className="muted">No documents uploaded yet.</p>}
        {docs.map((d: any) => (
          <div className="card" key={d.id}>
            <b>{d.type}</b> — {d.fileFormat.toUpperCase()}
            {isOwner && (
              <form action={removeDocument.bind(null, d.id)}>
                <button className="btn" type="submit">Delete</button>
              </form>
            )}
          </div>
        ))}
        {isOwner && (
          <p className="muted" style={{ fontSize: 11 }}>
            Document upload (PDF only) will connect once Supabase Storage is wired in — schema and delete flow are already in place.
          </p>
        )}

        <h2>Projects</h2>
        {projects.length === 0 && <p className="muted">No projects added yet.</p>}
        {projects.map((p: any) => (
          <div className="card" key={p.id}>
            <h3>{p.title}</h3>
            <p className="muted">{p.description}</p>
            {isOwner && (
              <form action={removeProject.bind(null, p.id)}>
                <button className="btn" type="submit">Delete</button>
              </form>
            )}
          </div>
        ))}

        {isOwner && (
          <div className="card">
            <h3>Add new project</h3>
            <form action={addProject}>
              <input name="title" placeholder="Project title" style={{ width: "100%", padding: 8, marginBottom: 8 }} required />
              <textarea name="description" placeholder="Short description" rows={2} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
              <p className="muted" style={{ fontSize: 11 }}>Laptop/mobile screenshot upload (JPEG) connects once Supabase Storage is wired in.</p>
              <button className="btn primary" type="submit">Add project</button>
            </form>
          </div>
        )}
      </main>
    </>
  );
}
