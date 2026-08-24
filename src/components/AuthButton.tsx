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
    <button className="btn primary" onClick={() => signIn("google")}>
      Continue with Google
    </button>
  );
}
