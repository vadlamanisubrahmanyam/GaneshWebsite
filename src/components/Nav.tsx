import Link from "next/link";
import { getSessionOrNull } from "@/lib/guards";
import { AuthButton } from "@/components/AuthButton";

export async function Nav() {
  const session = await getSessionOrNull();
  const role = (session?.user as any)?.role ?? null;

  return (
    <div className="masthead">
      <div className="brand">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#fff" }}>
          <div className="mark">C</div>
          <div className="name">Circuit</div>
        </Link>
      </div>
      <nav style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 13 }}>
        <Link href="/topics" style={{ color: "#dfe4f0", textDecoration: "none" }}>Topics</Link>
        <Link href="/portfolio" style={{ color: "#dfe4f0", textDecoration: "none" }}>My Portfolio</Link>
        <Link href="/submit" style={{ color: "#dfe4f0", textDecoration: "none" }}>Submit</Link>
        {role === "ADMIN" && (
          <Link href="/admin" style={{ color: "#dfe4f0", textDecoration: "none" }}>Admin</Link>
        )}
        <AuthButton />
      </nav>
    </div>
  );
}
