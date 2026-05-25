// docs.ts — server-side utilities for reading and compiling MDX doc files.
// All functions in this module are server-only — they use Node.js `fs`.
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { docsNav } from "./docs-nav";

const DOCS_DIR = path.join(process.cwd(), "src/content/docs");

export interface DocFrontmatter {
  title: string;
  description?: string;
}

export interface DocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface DocMeta {
  slug: string[];
  frontmatter: DocFrontmatter;
  excerpt: string;
}

// Resolve slug array to a filesystem path.
function slugToPath(slug: string[]): string {
  if (slug.length === 0) return path.join(DOCS_DIR, "index.mdx");
  return path.join(DOCS_DIR, ...slug) + ".mdx";
}

// Read raw MDX + frontmatter for a given slug.
export function getDoc(slug: string[]): {
  frontmatter: DocFrontmatter;
  content: string;
} | null {
  const filePath = slugToPath(slug);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return {
    frontmatter: data as DocFrontmatter,
    content,
  };
}

// Extract h2 and h3 headings from raw MDX content for the right-side TOC.
export function extractHeadings(content: string): DocHeading[] {
  const headings: DocHeading[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    if (h2) {
      const text = h2[1].replace(/`/g, "");
      headings.push({ id: slugify(text), text, level: 2 });
    } else if (h3) {
      const text = h3[1].replace(/`/g, "");
      headings.push({ id: slugify(text), text, level: 3 });
    }
  }
  return headings;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Walk src/content/docs and return every slug array (for generateStaticParams).
export function getAllDocSlugs(): string[][] {
  const slugs: string[][] = [];

  function walk(dir: string, base: string[]) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), [...base, entry.name]);
      } else if (entry.name.endsWith(".mdx")) {
        const name = entry.name.replace(/\.mdx$/, "");
        slugs.push(name === "index" ? base : [...base, name]);
      }
    }
  }

  walk(DOCS_DIR, []);
  return slugs;
}

// Build a flat manifest of all docs for client-side search.
export function getDocsManifest(): DocMeta[] {
  const manifest: DocMeta[] = [];

  function walk(dir: string, base: string[]) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), [...base, entry.name]);
      } else if (entry.name.endsWith(".mdx")) {
        const name = entry.name.replace(/\.mdx$/, "");
        const slug = name === "index" ? base : [...base, name];
        const raw = fs.readFileSync(path.join(dir, entry.name), "utf-8");
        const { data, content } = matter(raw);
        manifest.push({
          slug,
          frontmatter: data as DocFrontmatter,
          excerpt: content.replace(/^#+.+$/gm, "").replace(/```[\s\S]*?```/g, "").slice(0, 200).trim(),
        });
      }
    }
  }

  walk(DOCS_DIR, []);
  return manifest;
}

// Resolve previous / next links for bottom navigation.
export function getAdjacentDocs(slug: string[]): {
  prev: { title: string; href: string } | null;
  next: { title: string; href: string } | null;
} {
  const flat = docsNav.flatMap((s) => s.items);
  const href = slug.length === 0 ? "/docs" : "/docs/" + slug.join("/");
  const idx = flat.findIndex((item) => item.href === href);
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}
