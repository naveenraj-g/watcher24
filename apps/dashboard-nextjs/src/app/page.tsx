// Root page — immediately redirects to /overview.
// The middleware handles auth; if the user is not signed in they'll be
// redirected to /login before reaching this page.
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/overview");
}
