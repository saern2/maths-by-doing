import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maths by Doing | Arslan Shaikh",
  description: "Learn mathematics with Arslan Shaikh in Hyderabad, Pakistan. Classes 6–12, O Level, A Level, free YouTube lessons and individual online classes.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/maths-by-doing-logo.png",
    shortcut: "/maths-by-doing-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
