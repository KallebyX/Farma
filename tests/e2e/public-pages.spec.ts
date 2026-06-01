import { test, expect } from "@playwright/test";

/**
 * Smoke tests for the public surfaces (no auth needed). Opt-in like the rest of
 * the E2E suite: run with `RUN_E2E=1` against a running server
 * (`pnpm build && pnpm start`, or set E2E_BASE_URL to a preview URL).
 */
const ENABLED = process.env.RUN_E2E === "1";

test.describe("Public pages", () => {
  test.skip(!ENABLED, "Set RUN_E2E=1 with a running server to run E2E tests");

  test("landing renders and CTAs point to the right places", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /Criar conta/i }).first()).toHaveAttribute("href", "/sign-up");
    await expect(page.getByRole("link", { name: /demonstra/i }).first()).toHaveAttribute("href", "/demo/prontuario");
  });

  test("patient OTP login page renders step 1", async ({ page }) => {
    await page.goto("/entrar");
    await expect(page.getByText("Meu Prontuário")).toBeVisible();
    await expect(page.getByRole("button", { name: /Enviar código/i })).toBeVisible();
  });

  test("patient demo prontuário renders", async ({ page }) => {
    await page.goto("/demo/prontuario");
    await expect(page.locator("body")).toBeVisible();
  });

  test("staff sign-in page renders", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});
