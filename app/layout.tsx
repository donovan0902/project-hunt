import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Garden | New Location",
  description:
    "Garden has moved to a new URL.",
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
