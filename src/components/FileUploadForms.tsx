"use client";

import { useState, useTransition } from "react";

const ERROR_STYLE: React.CSSProperties = { color: "#b33", fontSize: 12, marginBottom: 8 };

export function DocumentUploadForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.type !== "application/pdf") {
      setError("Only PDF files are allowed — please choose a .pdf file.");
      e.target.value = "";
    } else if (file && file.size > 10 * 1024 * 1024) {
      setError("File is too large — max 10MB.");
      e.target.value = "";
    } else {
      setError(null);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      setError("Choose a PDF file first.");
      return;
    }
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed — please choose a .pdf file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large — max 10MB.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await action(formData);
        formEl.reset();
      } catch (err: any) {
        setError(err?.message || "Upload failed — please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <select name="docType" defaultValue="RESUME" style={{ width: "100%", padding: 8, marginBottom: 8 }}>
        <option value="RESUME">Resume</option>
        <option value="COVER_LETTER">Cover Letter</option>
        <option value="PORTFOLIO">Project Portfolio</option>
      </select>
      <input type="file" name="file" accept="application/pdf" required style={{ marginBottom: 4, display: "block" }} onChange={handleFileChange} />
      <p className="muted" style={{ fontSize: 11 }}>PDF only, max 10MB. Uploading replaces the existing file of that type.</p>
      {error && <p style={ERROR_STYLE}>{error}</p>}
      <button className="btn primary" type="submit" disabled={pending}>{pending ? "Uploading…" : "Upload"}</button>
    </form>
  );
}

export function ProjectUploadForm({ action }: { action: (formData: FormData) => Promise<void> }) {
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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    const title = String(formData.get("title") || "").trim();
    if (!title) {
      setError("Title is required.");
      return;
    }
    const laptop = formData.get("screenshotLaptop") as File | null;
    const mobile = formData.get("screenshotMobile") as File | null;
    for (const f of [laptop, mobile]) {
      if (f && f.size > 0 && f.type !== "image/jpeg") {
        setError("Only JPEG images are allowed — please choose .jpg/.jpeg files.");
        return;
      }
      if (f && f.size > 5 * 1024 * 1024) {
        setError("Image is too large — max 5MB.");
        return;
      }
    }

    setError(null);
    startTransition(async () => {
      try {
        await action(formData);
        formEl.reset();
      } catch (err: any) {
        setError(err?.message || "Failed to add project — please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Project title" style={{ width: "100%", padding: 8, marginBottom: 8 }} required />
      <textarea name="description" placeholder="Short description" rows={2} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
      <label className="muted" style={{ fontSize: 11 }}>Screenshot — laptop (JPEG)</label>
      <input type="file" name="screenshotLaptop" accept="image/jpeg" style={{ display: "block", marginBottom: 8 }} onChange={checkJpeg} />
      <label className="muted" style={{ fontSize: 11 }}>Screenshot — mobile (JPEG)</label>
      <input type="file" name="screenshotMobile" accept="image/jpeg" style={{ display: "block", marginBottom: 8 }} onChange={checkJpeg} />
      {error && <p style={ERROR_STYLE}>{error}</p>}
      <button className="btn primary" type="submit" disabled={pending}>{pending ? "Adding…" : "Add project"}</button>
    </form>
  );
}
