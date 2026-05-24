// Forgot-password page — sends a password-reset email via IAM.
"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await authClient.forgetPassword({
      email,
      redirectTo: "/reset-password",
    });

    if (authError) {
      setError(authError.message ?? "Could not send reset email");
      setLoading(false);
      return;
    }

    setSent(true);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
        </div>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          {sent
            ? "Check your email for a reset link"
            : "Enter your email and we'll send you a link"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              We sent a password reset link to <strong>{email}</strong>. It
              expires in 30 minutes.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to sign in
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
            <Link href="/login">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to sign in
              </Button>
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
