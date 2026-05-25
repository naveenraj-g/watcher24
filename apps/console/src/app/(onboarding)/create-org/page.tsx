"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

export default function CreateOrgPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugEdited, setSlugEdited] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) {
      setSlug(toSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(toSlug(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setLoading(true);

    const { data, error } = await authClient.organization.create({
      name: name.trim(),
      slug: slug.trim(),
    });

    if (error || !data) {
      toast.error(error?.message ?? "Failed to create organisation");
      setLoading(false);
      return;
    }

    // Set the new org as the active org in the session.
    await authClient.organization.setActive({
      organizationId: data.id,
    });

    router.push(`/onboarding/get-api-key?orgId=${data.id}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Name your organisation</CardTitle>
        <CardDescription>
          This is your team or company workspace. You can change it later in settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organisation name</Label>
            <Input
              id="name"
              placeholder="Acme Inc."
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">
              URL slug
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                app.watcher24.com/<span className="text-foreground">{slug || "your-org"}</span>
              </span>
            </Label>
            <Input
              id="slug"
              placeholder="acme-inc"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              pattern="[a-z0-9-]+"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !name.trim() || !slug.trim()}>
            {loading ? "Creating…" : "Create organisation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
