import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subrahmanyam — Community Topics, Reviews & Blogs",
  description: "Topics, Q&A/reviews, blogs, and Subrahmanyam's personal portfolio section.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
