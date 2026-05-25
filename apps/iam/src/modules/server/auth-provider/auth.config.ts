"server-only";

import { randomUUID } from "crypto";

// packages import
import { APIError, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
// import { getJwtToken } from "better-auth/plugins/jwt";
import { oauthProvider } from "@better-auth/oauth-provider";
import {
  openAPI,
  admin,
  jwt,
  organization,
  twoFactor,
  username,
  lastLoginMethod,
  createAccessControl,
  magicLink,
  customSession,
} from "better-auth/plugins";
import { apiKey } from "@better-auth/api-key";
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
// import { agentAuth } from "@better-auth/agent-auth";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";
// import { createFromOpenAPI } from "@better-auth/agent-auth/openapi";

// local import
import { prisma } from "../../../../prisma/db";
import {
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
  getChangeEmailTemplate,
  getDeleteAccountTemplate,
} from "@/modules/shared/email-templates/auth-email.templates";
import { sendAuthEmail } from "@/modules/server/utils/sendAuthEmail";
import {
  getOAuthClientOrigins,
  validAudiencesRef,
} from "./oauth-client-origins";
import { getUserPermissions } from "../utils/getUserPermissions";

// ── Types for customSession context payload ──────────────────────────────────
interface NavNode {
  id: string;
  label: string;
  slug: string;
  icon: string | null;
  href: string | null;
  type: string;
  permissionKeys: string[];
  children: NavNode[];
}

interface NavApp {
  id: string;
  name: string;
  slug: string;
  menus: NavNode[];
}

interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

// Warm the cache at module load so trustedOrigins and validAudiences are ready
// before the first request. Does not block module initialization.
void getOAuthClientOrigins();

// ── Shared user-context builder ───────────────────────────────────────────────
// Called by both customSession (has session → activeOrganizationId directly)
// and customUserInfoClaims (no session → resolved from latest DB session).
async function buildUserContext(userId: string, organizationId: string | null) {
  type RawNode = Awaited<
    ReturnType<typeof prisma.appMenuNode.findMany>
  >[number];

  const [permSet, memberships, appsData, userCtx] = await Promise.all([
    organizationId
      ? getUserPermissions(userId, organizationId)
      : Promise.resolve(new Set<string>()),
    prisma.member.findMany({
      where: { userId },
      select: {
        role: true,
        organization: {
          select: { id: true, name: true, slug: true, logo: true },
        },
      },
    }),
    prisma.app.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        menus: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
    }),
    prisma.userContext.findUnique({
      where: { userId },
      select: { activeRoleId: true },
    }),
  ]);

  function filterNode(node: RawNode): boolean {
    return (
      node.permissionKeys.length === 0 ||
      node.permissionKeys.some((k) => permSet.has(k))
    );
  }

  function buildTree(
    allNodes: RawNode[],
    parentId: string | null = null,
  ): NavNode[] {
    return allNodes
      .filter((n) => (n.parentId ?? null) === parentId)
      .flatMap((n) => {
        if (!filterNode(n)) return [];
        const children = buildTree(allNodes, n.id);
        if (n.type === "GROUP" && children.length === 0) return [];
        return [
          {
            id: n.id,
            label: n.label,
            slug: n.slug,
            icon: n.icon ?? null,
            href: n.href ?? null,
            type: n.type,
            permissionKeys: n.permissionKeys,
            children,
          },
        ];
      });
  }

  const apps: NavApp[] = appsData
    .map((app) => ({
      id: app.id,
      name: app.name,
      slug: app.slug,
      menus: buildTree(app.menus),
    }))
    .filter((app) => app.menus.length > 0);

  const organizations: OrgSummary[] = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    logo: m.organization.logo,
  }));

  const rawRole = organizationId
    ? (memberships.find((m) => m.organization.id === organizationId)?.role ??
      null)
    : null;
  const activeOrganizationRoles = rawRole
    ? rawRole.split(",").map((r) => r.trim())
    : [];

  const activeRoleId = userCtx?.activeRoleId ?? null;

  let activeRole: string | null = null;
  let activeRoleRedirectUrl: string | null = null;

  if (activeRoleId) {
    const orgRole = await prisma.organizationRole.findUnique({
      where: { id: activeRoleId },
      select: { role: true },
    });
    activeRole = orgRole?.role ?? null;

    if (activeRole && organizationId) {
      const redirect = await prisma.userOrgRoleRedirect.findUnique({
        where: {
          userId_organizationId_role: {
            userId,
            organizationId,
            role: activeRole,
          },
        },
        select: { redirectUrl: true },
      });
      activeRoleRedirectUrl = redirect?.redirectUrl ?? null;
    }
  }

  return {
    apps,
    permissions: Array.from(permSet),
    organizations,
    activeOrganizationRoles,
    activeRoleId,
    activeRole,
    activeRoleRedirectUrl,
  };
}

// Single source of truth — controls both emailAndPassword config and the
// OAuth2 authorize hook that enforces verification before the OAuth flow.
const REQUIRE_EMAIL_VERIFICATION = false;

const statement = {
  ...defaultStatements,
} as const;

const ac = createAccessControl(statement);

const superAdminRole = ac.newRole({
  ...adminAc.statements,
});

const guestRole = ac.newRole({
  user: ["get"],
});

// const spec = await fetch(process.env.FHIR_OPENAPI_URL!).then((r) => r.json());

export const authConfig = {
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  rateLimit: {
    window: 60,
    max: 100,
    // Persist rate limit counters across restarts; prevents bypass via process churn.
    storage: "database",
    customRules: {
      "/sign-in/email":            { window: 60, max: 5 },
      "/sign-up/email":            { window: 60, max: 3 },
      "/forget-password":          { window: 60, max: 3 },
      "/magic-link/send-magic-link": { window: 60, max: 3 },
      "/two-factor/send-otp":      { window: 60, max: 5 },
    },
  },

  session: {
    storeSessionInDatabase: true,
    expiresIn: 60 * 60 * 24 * 7,   // 7 days
    updateAge: 60 * 60 * 24,        // refresh every 24 h
    freshAge: 60 * 60,              // require re-auth after 1 h for sensitive actions

    // jwe encrypts the session payload in the cookie so org/role data is not
    // readable by the browser even though the cookie is httpOnly.
    cookieCache: {
      enabled: true,
      maxAge: 60,
      strategy: "jwe",
    },
  },

  account: {
    // Encrypt GitHub/Google access tokens stored in the database (AES-256-GCM).
    encryptOAuthTokens: true,
  },

  advanced: {
    ipAddress: {
      // Read real client IP from reverse-proxy headers for accurate rate limiting.
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
      disableIpTracking: false,
    },
  },

  experimental: {
    joins: true,
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Generate username for OAuth users who don't have one
          if (!user.username) {
            try {
              const base =
                user.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, "")
                  .slice(0, 20) || "user";

              let username = "";
              for (let i = 0; i < 10; i++) {
                const suffix = Math.floor(1000 + Math.random() * 9000);
                const candidate = `${base}${suffix}`;
                const existing = await prisma.user.findFirst({
                  where: { username: candidate },
                  select: { id: true },
                });
                if (!existing) {
                  username = candidate;
                  break;
                }
              }

              // if (username) {
              //   await prisma.user.update({
              //     where: { id: user.id },
              //     data: { username },
              //   });
              // }
              return {
                data: {
                  ...user,
                  username,
                },
              };
            } catch {
              return {
                data: {
                  ...user,
                },
              };
              // Don't block signup if username generation fails
            }
          }
        },
      },
    },

    session: {
      create: {
        before: async (session) => {
          const userCtx = await prisma.userContext.findUnique({
            where: { userId: session.userId },
            select: { activeOrganizationId: true },
          });

          // First-ever session for this user — create a UserContext with no
          // active org so the console onboarding wizard runs on first login.
          // Org creation and activation are handled there, not here.
          if (!userCtx) {
            await prisma.userContext.create({
              data: {
                userId: session.userId,
                activeOrganizationId: null,
                activeRoleId: null,
              },
            });
            return { data: { ...session, activeOrganizationId: null } };
          }

          // Returning user — restore their last active org, falling back to
          // their earliest membership if the context row has no org yet.
          const activeOrganizationId =
            userCtx.activeOrganizationId ??
            (
              await prisma.member.findFirst({
                where: { userId: session.userId },
                orderBy: { createdAt: "asc" },
                select: { organizationId: true },
              })
            )?.organizationId ??
            null;

          return { data: { ...session, activeOrganizationId } };
        },
      },
    },
  },

  // advanced: {
  //   crossSubDomainCookies: {
  //     enabled: true,
  //     domain: "drgodly.com",
  //   },
  // },

  // Dynamically load redirect URI origins from registered OAuth clients.
  // Better Auth calls this async function per-request (with TTL cache).
  trustedOrigins: async () => getOAuthClientOrigins(),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: REQUIRE_EMAIL_VERIFICATION,
    minPasswordLength: 8,
    // Reset token expires in 30 minutes; default is 1 hour.
    resetPasswordTokenExpiresIn: 60 * 30,
    // Invalidate all sessions when the user resets their password so a
    // compromised session cannot be used after the password has changed.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      void sendAuthEmail({
        to: user.email,
        subject: "Reset your password — Watcher24",
        html: getPasswordResetTemplate(url, user.name, "Watcher24"),
      });
    },
    onPasswordReset: async ({ user }) => {
      console.log(`Password reset for user ${user.email}`);
    },
    onExistingUserSignUp: async ({ user }) => {
      void sendAuthEmail({
        to: user.email,
        subject: "Sign-up attempt with your email — Watcher24",
        html: "<p>Someone tried to create an account using your email address. If this was you, try signing in instead. If not, you can safely ignore this email.</p>",
      });
    },
  },

  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendAuthEmail({
        to: user.email,
        subject: "Verify email",
        html: getEmailVerificationTemplate(
          url,
          user.name,
          "Watcher24",
        ),
      });
    },
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, url }) => {
        void sendAuthEmail({
          to: user.email,
          subject: "Confirm your new email address — Watcher24",
          html: getChangeEmailTemplate(url, user.name, "Watcher24"),
        });
      },
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        void sendAuthEmail({
          to: user.email,
          subject: "Confirm account deletion — Watcher24",
          html: getDeleteAccountTemplate(url, user.name, "Watcher24"),
        });
      },
    },
  },

  disabledPaths: [],

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const token = ctx.getCookie(ctx.context.authCookies.sessionToken.name);

      // ── OAuth authorize: block authenticated but unverified users ───────────
      if (ctx.path === "/oauth2/authorize") {
        // Not authenticated — Better Auth redirects to loginPage automatically
        if (!token) return;

        const [sessionId] = token.split(".");
        const session =
          await ctx.context.internalAdapter.findSession(sessionId);

        if (
          session &&
          !session.user.emailVerified &&
          REQUIRE_EMAIL_VERIFICATION
        ) {
          // Preserve the full OAuth query string so the flow can resume after verification
          const requestUrl = new URL(ctx.request?.url as string);
          const authorizeRelativeUrl = `/api/auth/oauth2/authorize?${requestUrl.searchParams.toString()}`;
          const appUrl = process.env.BETTER_AUTH_URL!;
          const location = `${appUrl}/auth/email-verification?email=${encodeURIComponent(session.user.email)}&redirect=${encodeURIComponent(authorizeRelativeUrl)}`;

          return new Response(null, {
            status: 302,
            headers: { Location: location },
          });
        }

        return;
      }

      // ── Admin-only paths ─────────────────────────────────────────────────────
      const protectedPaths = new Set([
        "/oauth2/create-client",
        "/oauth2/register",
      ]);

      if (!protectedPaths.has(ctx.path)) return;

      if (!token)
        throw new APIError("UNAUTHORIZED", {
          message: "You must be logged in to perform this action",
        });

      const [sessionId] = token.split(".");

      const session = await ctx.context.internalAdapter.findSession(sessionId);

      if (!session) {
        throw new APIError("UNAUTHORIZED", {
          message: "Session expired or invalid. Please log in again.",
        });
      }

      const user = session.user;

      if (user.role !== "superadmin") {
        throw new APIError("FORBIDDEN", {
          message: "Only superadmin can create OAuth clients",
        });
      }
    }),
  },

  plugins: [
    openAPI(),

    username({
      minUsernameLength: 4,
      maxUsernameLength: 32,
      usernameValidator: (username) => {
        if (username === "admin" || username === "superadmin") {
          return false;
        }
        return true;
      },
    }),

    twoFactor({
      skipVerificationOnEnable: true,
      otpOptions: {
        sendOTP: async ({ user, otp }) => {
          void sendAuthEmail({
            to: user.email,
            subject: "2 FA OTP",
            html: `Your 2 FA OTP: ${otp}`,
          });
        },
      },
    }),

    jwt({
      jwt: {
        definePayload: async ({ user, session }) => {
          const orgId = session.activeOrganizationId;

          const ctx = await buildUserContext(user.id, orgId);

          return {
            ...user,
            activeOrganizationId: session.activeOrganizationId,
            activeTeamId: session.activeTeamId,
            ...ctx,
          };
        },
      },
    }),

    organization({
      allowUserToCreateOrganization: async () => {
        return true;
      },
      teams: {
        enabled: true,
        allowRemovingAllTeams: true,
      },
      ac,
      dynamicAccessControl: {
        enabled: true,
      },
    }),

    admin({
      ac,
      roles: {
        superadmin: superAdminRole,
        guest: guestRole,
      },
      adminRoles: ["superadmin"],
      defaultRole: "guest",
    }),

    oauthProvider({
      loginPage: process.env.LOGIN_PAGE!,
      consentPage: process.env.CONSENT_PAGE!,
      signup: {
        page: process.env.SIGNUP_PAGE!,
      },

      silenceWarnings: {
        oauthAuthServerConfig: true,
      },

      scopes: ["openid", "profile", "email", "offline_access"],

      storeClientSecret: "hashed",

      allowDynamicClientRegistration: false,

      clientPrivileges: ({ user }) => {
        if (!user) return false;
        return user.role === "superadmin";
      },

      customUserInfoClaims: async ({ user, jwt }) => {
        // jwt.sid is the session ID that authorized this token.
        // Use it directly — no OauthAccessToken join needed, and it is
        // correct even when the user has multiple active sessions with
        // different activeOrganizationIds.
        const sid = (jwt as Record<string, unknown> | null)?.sid as
          | string
          | undefined;

        let organizationId: string | null = null;

        if (sid) {
          const session = await prisma.session.findUnique({
            where: { id: sid },
          });
          organizationId =
            (
              session as typeof session & {
                activeOrganizationId?: string | null;
              }
            )?.activeOrganizationId ?? null;
        }

        const ctx = await buildUserContext(user.id, organizationId);
        return { ...ctx, activeOrganizationId: organizationId };
      },

      // Mutable array reference: Better Auth reads opts.validAudiences on
      // every token/authorize request, so mutating this array in-place
      // (done by refreshOAuthClientOrigins) makes it effectively dynamic.
      validAudiences: validAudiencesRef,
    }),

    lastLoginMethod(),

    magicLink({
      sendMagicLink: async ({ email, url }) => {
        void sendAuthEmail({
          to: email,
          subject: "Your magic link",
          html: `<a href="${url}">Sign in with magic link</a>`,
        });
      },
    }),

    apiKey({ defaultPrefix: "wtch_" }),

    stripe({
      stripeClient: new Stripe(process.env.STRIPE_SECRET_KEY ?? ""),
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",

      // Create a Stripe customer record when a user signs up so billing
      // info is available before the user ever starts a subscription.
      createCustomerOnSignUp: true,

      subscription: {
        enabled: true,
        plans: [
          {
            // Free tier — no priceId; users start here by default.
            name: "free",
            limits: { events: 100_000 },
          },
          {
            name: "pro",
            priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
            annualDiscountPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
            limits: { events: 5_000_000 },
          },
          {
            name: "enterprise",
            priceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
            annualDiscountPriceId: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID,
            limits: { events: -1 },
          },
        ],
      },
    }),

    // agentAuth({
    //   ...createFromOpenAPI(spec, {
    //     baseUrl: process.env.FHIR_SERVER_URL!,
    //     async resolveHeaders({ ctx }) {
    //       const token = await getJwtToken(ctx);

    //       return {
    //         Authorization: `Bearer ${token}`,
    //       };
    //     },
    //   }),
    // }),

    // ── Context: attach nav apps, permissions, and org list to every session ──
    // Runs at most once per cookie-cache TTL (60 s).
    customSession(async ({ user, session }) => {
      const sessionData = session as typeof session & {
        activeOrganizationId?: string | null;
      };
      const organizationId = sessionData.activeOrganizationId ?? null;
      const ctx = await buildUserContext(user.id, organizationId);

      return {
        user,
        session: { ...session, ...ctx },
      };
    }),

    // NOTE: This plugin make sure the application knows how to set cookies in next.js, it is required for server side operations with better-auth
    nextCookies(),
  ],
} satisfies BetterAuthOptions;

/* 
{
      providerName: "My API",
      providerDescription: "My MCP-enabled API",

      modes: ["delegated", "autonomous"],

      capabilities: [
        {
          name: "hello_world",
          description: "Test capability",
        },
        {
          name: "create_user",
          description: "Create a new user",
          input: {
            type: "object",
            properties: {
              name: { type: "string" },
            },
            required: ["name"],
          },
        },
      ],

      async onExecute({ capability, arguments: args, agentSession }) {
        if (capability === "hello_world") {
          return { message: "Hello from BetterAuth 🚀" };
        }

        if (capability === "create_user") {
          return {
            ok: true,
            name: args?.name,
            createdBy: agentSession.user?.id,
          };
        }

        throw new Error("Unknown capability");
      },
    }
*/
