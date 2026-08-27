import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { getSessionOrNull } from "@/lib/guards";
import { submitContent } from "@/lib/actions";

export const dynamic = "force-dynamic";

async function handleSubmit(formData: FormData) {
  "use server";
  const result = await submitContent(formData);
  if (result?.redirectTo) redirect(result.redirectTo);
}

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; category?: string }>;
}) {
  const session = await getSessionOrNull();
  const params = await searchParams;
  const defaultKind = params.kind === "blog" ? "blog" : "topic";
  const defaultCategory = params.category ?? "";

  return (
    <>
      <Nav />
      <main>
        <h1>Submit new content</h1>
        <p className="muted">
          Use this page to start a new <b>Topic</b> (a new discussion category, like "Home Cooking") or
          publish a full <b>Blog post</b>. To ask a question or post a review inside an existing topic,
          open that topic's page instead — it has its own quick-post form.
        </p>

        {!session ? (
          <p className="muted">Sign in to submit content.</p>
        ) : (
          <form action={handleSubmit} className="card">
            <div style={{ marginBottom: 10 }}>
              <label className="muted">Type&nbsp;</label>
              <select name="kind" defaultValue={defaultKind}>
                <option value="topic">Topic</option>
                <option value="blog">Blog post</option>
              </select>
            </div>
            <input name="title" placeholder="Title" style={{ width: "100%", padding: 8, marginBottom: 8 }} required />
            <input
              name="category"
              placeholder="Category (for blog posts — must match an existing topic title)"
              defaultValue={defaultCategory}
              style={{ width: "100%", padding: 8, marginBottom: 8 }}
            />
            <textarea name="content" placeholder="Write your content..." rows={6} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
            <p className="muted" style={{ fontSize: 11 }}>Cover image upload (JPEG) will be added once wired to blog posts — see README.</p>
            <button className="btn primary" type="submit">Publish</button>
          </form>
        )}
      </main>
    </>
  );
}
