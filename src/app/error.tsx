"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", fontFamily: "sans-serif" }}>
      <h2>Something went wrong</h2>
      <p style={{ color: "#6b7280", fontSize: 14 }}>{error.message || "An unexpected error occurred."}</p>
      <button
        onClick={() => reset()}
        style={{ marginTop: 16, padding: "8px 16px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}
      >
        Try again
      </button>
    </div>
  );
}
