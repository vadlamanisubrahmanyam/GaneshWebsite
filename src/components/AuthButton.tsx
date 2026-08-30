"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (session) {
    return (
      <button className="btn" onClick={() => signOut()}>
        Sign out ({session.user?.name})
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button className="btn primary" onClick={() => signIn("google")}>
        Continue with Google
      </button>
      <button className="btn primary" onClick={() => signIn("azure-ad")}>
        Continue with Microsoft
      </button>
    </div>
  );
}
