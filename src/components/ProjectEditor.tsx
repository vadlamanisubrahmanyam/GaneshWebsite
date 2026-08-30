"use client";

import { useState, useTransition } from "react";

const ERROR_STYLE: React.CSSProperties = { color: "#b33", fontSize: 12, marginTop: 6 };

type Project = {
  id: string;
  title: string;
  description?: string | null;
};

export function ProjectEditor({
  project,
  updateAction,
  removeAction,
}: {
  project: Project;
  updateAction: (formData: FormData) => Promise<void>;
  removeAction: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function checkJpeg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/jpeg") {
      setError("Only JPEG images are allowed — please choose a .jpg/.jpeg file.");
      e.target.value = "";
    } else if (file.size > 5 * 1024 * 1024) {
      setError("Image is too large — max 5MB.");
      e.target.value = "";
    } else {
      setError(null);
    }
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    const title = String(formData.get("title") || "").trim();
    if (!title) {
      setError("Title is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await updateAction(formData);
        setEditing(false);
      } catch (err: any) {
        setError(err?.message || "Failed to save changes — please try again.");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${project.title}"? This can't be undone.`)) return;
    startTransition(async () => {
      try {
        await removeAction();
      } catch (err: any) {
        setError(err?.message || "Failed to delete — please try again.");
      }
    });
  }

  if (!editing) {
    return (
      <>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn small" type="button" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn small danger" type="button" onClick={handleDelete} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
        {error && <p style={ERROR_STYLE}>{error}</p>}
      </>
    );
  }

  return (
    <form onSubmit={handleSave} style={{ marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
      <label className="muted" style={{ fontSize: 11 }}>Title</label>
      <input name="title" defaultValue={project.title} style={{ width: "100%", padding: 8, margin: "4px 0 8px" }} required />
      <label className="muted" style={{ fontSize: 11 }}>Description</label>
      <textarea name="description" defaultValue={project.description ?? ""} rows={2} style={{ width: "100%", padding: 8, margin: "4px 0 8px" }} />
      <label className="muted" style={{ fontSize: 11 }}>Replace laptop screenshot (optional, JPEG)</label>
      <input type="file" name="screenshotLaptop" accept="image/jpeg" style={{ display: "block", marginBottom: 8 }} onChange={checkJpeg} />
      <label className="muted" style={{ fontSize: 11 }}>Replace mobile screenshot (optional, JPEG)</label>
      <input type="file" name="screenshotMobile" accept="image/jpeg" style={{ display: "block", marginBottom: 8 }} onChange={checkJpeg} />
      <p className="muted" style={{ fontSize: 11 }}>Leave a screenshot field empty to keep the current image.</p>
      {error && <p style={ERROR_STYLE}>{error}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button className="btn primary small" type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        <button className="btn small" type="button" onClick={() => { setEditing(false); setError(null); }}>Cancel</button>
      </div>
    </form>
  );
}
