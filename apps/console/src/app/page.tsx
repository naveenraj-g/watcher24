// Root page — redirects to /overview (dashboard layout then handles org check).
// Unauthenticated users are caught by middleware and sent to /login first.
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/overview");
}
