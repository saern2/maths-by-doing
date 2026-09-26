import type { Metadata } from "next";
import "./admin.css";
export const metadata: Metadata = {
  title: "Teacher studio | Maths by Doing",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root">{children}</div>;
}
