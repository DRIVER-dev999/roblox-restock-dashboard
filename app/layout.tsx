import type { Metadata } from "next";
import "./globals.css"; 

export const metadata: Metadata = {
  title: "Roblox Restock Nexus",
  description: "Real-time Roblox item monitor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
