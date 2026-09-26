import { authenticated, authConfigured } from "@/lib/admin-auth";
import { readContent } from "@/db/admin";
import AdminStudio from "./studio";
import Login from "./login";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  let isAuthenticated = false;
  try {
    isAuthenticated = await authenticated();
  } catch {
    return <Login configured={authConfigured()} unavailable />;
  }
  if (!isAuthenticated) return <Login configured={authConfigured()} />;
  let data;
  try {
    data = await readContent();
  } catch {
    return <Login configured={authConfigured()} unavailable />;
  }
  return <AdminStudio initial={data} />;
}
