import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { navItems } from "@/components/layout/nav-items";

const root = process.cwd();

/** True if an internal href resolves to a real page file (static or dynamic). */
function pageExists(href: string): boolean {
  if (href === "/") return existsSync(path.join(root, "app/page.tsx"));
  const seg = href.replace(/^\//, "").replace(/\/$/, "");
  const candidates = [
    `app/(app)/${seg}/page.tsx`,
    `app/${seg}/page.tsx`,
    `app/${seg}/page.jsx`,
  ];
  return candidates.some((c) => existsSync(path.join(root, c)));
}

describe("navigation integrity", () => {
  it("every sidebar/drawer link resolves to a real page (no dead links)", () => {
    for (const item of navItems) {
      expect(pageExists(item.href), `missing page for nav item ${item.href}`).toBe(true);
    }
  });

  it("nav hrefs are unique", () => {
    const hrefs = navItems.map((n) => n.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("public entry routes exist", () => {
    for (const href of ["/", "/sign-in", "/sign-up", "/entrar", "/demo/prontuario", "/legal/privacy", "/legal/terms"]) {
      expect(pageExists(href), `missing public route ${href}`).toBe(true);
    }
  });
});

describe("landing page links", () => {
  it("every internal link on the landing page resolves (no dead buttons)", () => {
    const src = readFileSync(path.join(root, "app/page.tsx"), "utf8");
    const hrefs = [...src.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(3);
    for (const href of new Set(hrefs)) {
      expect(pageExists(href), `landing links to missing route ${href}`).toBe(true);
    }
  });
});
