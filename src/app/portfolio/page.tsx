import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/prisma";
import { getSessionOrNull } from "@/lib/guards";
import { updateProfile, addProject, removeProject, removeDocument, uploadDocument } from "@/lib/actions";

export const dynamic = "force-dynamic";

const DOC_LABELS: Record<string, string> = {
  RESUME: "Resume",
  COVER_LETTER: "Cover Letter",
  PORTFOLIO: "Project Portfolio",
};

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
        <h1>Subrahmanyam's Portfolio</h1>
        <p className="muted">
          {isOwner
            ? "Owner view — you can edit everything below."
            : "Showcasing projects, skills, and work samples."}
        </p>

        <div className="card">
          <h3>Profile</h3>
          <p className="muted">LinkedIn: {profile?.linkedinUrl ? <a href={profile.linkedinUrl} target="_blank" rel="noreferrer">{profile.linkedinUrl}</a> : "—"}</p>
          <p className="muted">GitHub: {profile?.githubUrl ? <a href={profile.githubUrl} target="_blank" rel="noreferrer">{profile.githubUrl}</a> : "—"}</p>
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
            <b>{DOC_LABELS[d.type] ?? d.type}</b>
            {" — "}
            <a href={d.fileUrl} target="_blank" rel="noreferrer">View / Download ({d.fileFormat.toUpperCase()})</a>
            {isOwner && (
              <form action={removeDocument.bind(null, d.id)} style={{ marginTop: 6 }}>
                <button className="btn" type="submit">Delete</button>
              </form>
            )}
          </div>
        ))}
        {isOwner && (
          <div className="card">
            <h3>Upload document</h3>
            <form action={uploadDocument}>
              <select name="docType" defaultValue="RESUME" style={{ width: "100%", padding: 8, marginBottom: 8 }}>
                <option value="RESUME">Resume</option>
                <option value="COVER_LETTER">Cover Letter</option>
                <option value="PORTFOLIO">Project Portfolio</option>
              </select>
              <input type="file" name="file" accept="application/pdf" required style={{ marginBottom: 8, display: "block" }} />
              <p className="muted" style={{ fontSize: 11 }}>PDF only, max 10MB. Uploading replaces the existing file of the same type.</p>
              <button className="btn primary" type="submit">Upload</button>
            </form>
          </div>
        )}

        <h2>Projects</h2>
        {projects.length === 0 && <p className="muted">No projects added yet.</p>}
        {projects.map((p: any) => (
          <div className="card" key={p.id}>
            <h3>{p.title}</h3>
            <p className="muted">{p.description}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {p.screenshotLaptopUrl && (
                <a href={p.screenshotLaptopUrl} target="_blank" rel="noreferrer">
                  <img src={p.screenshotLaptopUrl} alt="Laptop screenshot" style={{ width: 160, height: 100, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }} />
                </a>
              )}
              {p.screenshotMobileUrl && (
                <a href={p.screenshotMobileUrl} target="_blank" rel="noreferrer">
                  <img src={p.screenshotMobileUrl} alt="Mobile screenshot" style={{ width: 80, height: 100, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }} />
                </a>
              )}
            </div>
            {isOwner && (
              <form action={removeProject.bind(null, p.id)} style={{ marginTop: 8 }}>
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
              <label className="muted" style={{ fontSize: 11 }}>Screenshot — laptop (JPEG)</label>
              <input type="file" name="screenshotLaptop" accept="image/jpeg" style={{ display: "block", marginBottom: 8 }} />
              <label className="muted" style={{ fontSize: 11 }}>Screenshot — mobile (JPEG)</label>
              <input type="file" name="screenshotMobile" accept="image/jpeg" style={{ display: "block", marginBottom: 8 }} />
              <button className="btn primary" type="submit">Add project</button>
            </form>
          </div>
        )}
      </main>
    </>
  );
}
