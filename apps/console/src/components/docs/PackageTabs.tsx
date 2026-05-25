"use client";
// PackageTabs — tabbed package manager install command block.
// Renders npm / pnpm / yarn tabs for JS packages, or pip / uv / poetry for Python.
// Usage in MDX:
//   <PackageTabs pkg="@watcher/node" />
//   <PackageTabs pkg="watcher-sdk" python />
import { useState } from "react";
import { CopyButton } from "./CopyButton";

type JsManager = "npm" | "pnpm" | "yarn";
type PyManager = "pip" | "uv" | "poetry";

interface Props {
  pkg: string;
  python?: boolean;
}

function jsCommand(manager: JsManager, pkg: string): string {
  if (manager === "npm") return `npm install ${pkg}`;
  if (manager === "pnpm") return `pnpm add ${pkg}`;
  return `yarn add ${pkg}`;
}

function pyCommand(manager: PyManager, pkg: string): string {
  if (manager === "pip") return `pip install ${pkg}`;
  if (manager === "uv") return `uv add ${pkg}`;
  return `poetry add ${pkg}`;
}

export function PackageTabs({ pkg, python = false }: Props) {
  const jsTabs: JsManager[] = ["npm", "pnpm", "yarn"];
  const pyTabs: PyManager[] = ["pip", "uv", "poetry"];

  const [activeJs, setActiveJs] = useState<JsManager>("npm");
  const [activePy, setActivePy] = useState<PyManager>("pip");

  const activeTab = python ? activePy : activeJs;
  const command = python
    ? pyCommand(activePy, pkg)
    : jsCommand(activeJs, pkg);
  const tabs = python ? pyTabs : jsTabs;

  return (
    <div className="relative my-6 overflow-hidden rounded-lg border bg-[#0d1117]">
      {/* Tabs row */}
      <div className="flex border-b border-white/10">
        {(tabs as string[]).map((tab) => (
          <button
            key={tab}
            onClick={() =>
              python
                ? setActivePy(tab as PyManager)
                : setActiveJs(tab as JsManager)
            }
            className={`px-4 py-2 text-xs font-mono transition-colors ${
              tab === activeTab
                ? "border-b-2 border-primary bg-white/5 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Command line */}
      <div className="relative">
        <CopyButton text={command} />
        <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
          <code>
            <span className="select-none text-zinc-500">$ </span>
            <span className="text-white">{command}</span>
          </code>
        </pre>
      </div>
    </div>
  );
}
