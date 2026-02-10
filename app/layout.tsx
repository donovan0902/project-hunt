import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Garden | Scheduled Maintenance",
  description:
    "Garden is currently undergoing scheduled maintenance. We'll be back shortly.",
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
