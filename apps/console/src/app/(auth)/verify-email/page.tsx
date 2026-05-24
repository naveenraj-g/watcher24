// Verify-email page — two modes:
//   ?pending=true  — user just signed up, waiting to click the link
//   ?token=<tok>   — user clicked the link; we verify automatically on mount
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Activity, CheckCircle, XCircle, Loader2 } from "lucide-react";

type State = "pending" | "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const pending = searchParams.get("pending") === "true";

  const [state, setState] = useState<State>(token ? "verifying" : "pending");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    authClient.verifyEmail({ query: { token } }).then(({ error }) => {
      if (error) {
        setErrorMsg(error.message ?? "Verification failed");
        setState("error");
      } else {
        setState("success");
        setTimeout(() => router.push("/overview"), 2000);
      }
    });
  }, [token, router]);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
        </div>
        <CardTitle className="text-xl">Email verification</CardTitle>
        <CardDescription>
          {state === "pending" && "Check your inbox"}
          {state === "verifying" && "Verifying your email…"}
          {state === "success" && "Email verified"}
          {state === "error" && "Verification failed"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 text-center">
        {state === "pending" && (
          <>
            <p className="text-sm text-muted-foreground">
              We sent a verification link to your email address. Click it to
              activate your account.
            </p>
            <p className="text-xs text-muted-foreground">
              Didn&apos;t receive it? Check your spam folder or{" "}
              <Link
                href="/signup"
                className="underline-offset-4 hover:underline"
              >
                try again
              </Link>
              .
            </p>
          </>
        )}

        {state === "verifying" && (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        )}

        {state === "success" && (
          <>
            <CheckCircle className="h-10 w-10 text-green-500" />
            <p className="text-sm text-muted-foreground">
              Your email has been verified. Redirecting you to the dashboard…
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {errorMsg ?? "The verification link may have expired."}
            </p>
            <Link href="/login">
              <Button variant="outline">Back to sign in</Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
