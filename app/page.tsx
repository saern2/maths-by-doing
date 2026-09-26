import Home from "./home-client";
import { publicContent } from "@/db/admin";
export const dynamic = "force-dynamic";
export default async function Page() {
  return <Home content={await publicContent()} />;
}
