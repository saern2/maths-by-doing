import {
  authenticated,
  authConfigured,
  adminSetupIssues,
} from "@/lib/admin-auth";
import { readContent } from "@/db/admin";
import AdminStudio from "./studio";
import Login from "./login";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  let isAuthenticated = false;
  try {
    isAuthenticated = await authenticated();
  } catch {
    return (
      <Login
        configured={authConfigured()}
        setupIssues={adminSetupIssues()}
        unavailable
      />
    );
  }
  if (!isAuthenticated)
    return (
      <Login configured={authConfigured()} setupIssues={adminSetupIssues()} />
    );
  let data;
  try {
    data = await readContent();
  } catch {
    return (
      <Login
        configured={authConfigured()}
        setupIssues={adminSetupIssues()}
        unavailable
      />
    );
  }
  return <AdminStudio initial={data} />;
}
