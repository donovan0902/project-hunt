import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Garden | Temporarily Offline",
  description:
    "Garden is temporarily offline while we migrate to Honda's corporate infrastructure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-zinc-50 text-zinc-900 font-sans">
        {children}
      </body>
    </html>
  );
}
