import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { Header } from "@/components/header";
import { WorkOsWidgets } from "@workos-inc/widgets";
import { UserStoreProvider } from "@/components/UserStoreProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Garden | Internal launch visibility",
  description:
    "An internal Product Hunt-style surface so teams can share progress, unblock faster, and celebrate momentum.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-50 text-zinc-900`}
      >
          <ConvexClientProvider>
            <WorkOsWidgets>
              <Header />
                <UserStoreProvider>
                  {children}
                </UserStoreProvider>
            </WorkOsWidgets>
          </ConvexClientProvider>
      </body>
    </html>
  );
}
