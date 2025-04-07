import type { Metadata } from "next";
import "./globals.css";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";

export const metadata: Metadata = {
  title: "AnyBoot - OS Installer",
  description: "Configure and install operating systems easily.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
    </html>
  );
}
