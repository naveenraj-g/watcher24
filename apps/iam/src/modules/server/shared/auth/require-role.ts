import { redirect } from "@/i18n/navigation";
import { getServerSession } from "../../auth-provider/auth-server";
import { getLocale } from "next-intl/server";

export async function requireRole(roles: string[]) {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session && !(session as any).user) {
    redirect({ href: "/auth/sign-in", locale });
  }

  if (
    !(session?.user as any).role ||
    !roles.includes((session?.user as any).role)
  ) {
    redirect({ href: "/", locale });
  }

  return session;
}
