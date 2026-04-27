import { test, expect } from "@playwright/test";

const ENABLED = process.env.RUN_E2E === "1";

test.describe("Team invitations E2E", () => {
  test.skip(!ENABLED, "Set RUN_E2E=1 with seeded DB and dev server to run E2E tests");

  test("OWNER can invite an ATTENDANT and the invitee can accept", async ({ page, context }) => {
    // Login as seeded OWNER
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("owner@demo.farma");
    await page.getByLabel("Senha").fill("admin123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Navigate to team page
    await page.goto("/settings/team");
    await page.getByRole("button", { name: "Convidar membro" }).click();

    const email = `invited+${Date.now()}@x.com`;
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Papel").selectOption("ATTENDANT");

    // Ensure LINK channel is selected (default), uncheck EMAIL to avoid Resend hit in CI
    const emailCheckbox = page.getByRole("checkbox", { name: /^Email/ });
    if (await emailCheckbox.isChecked()) await emailCheckbox.click();

    await page.getByRole("button", { name: "Enviar convite" }).click();
    await expect(page.getByText("Convite criado")).toBeVisible();

    const link = await page.locator(".font-mono").first().innerText();
    expect(link).toContain("/accept-invite/");

    // Open invite link in a fresh browser context (no auth cookie)
    const guest = await context.browser()!.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(link);
    await expect(guestPage.getByText("Convite para a equipe")).toBeVisible();

    await guestPage.getByLabel("Nome completo").fill("Atendente Teste");
    await guestPage.getByLabel(/Crie uma senha|Defina uma nova senha/).fill("senhaForte1");
    await guestPage.getByLabel("Confirme a senha").fill("senhaForte1");
    await guestPage.getByRole("checkbox", { name: /Li e aceito/ }).check();
    await guestPage.getByRole("button", { name: /Aceitar e entrar/ }).click();
    await expect(guestPage).toHaveURL(/\/dashboard|\/sign-in/);
    await guest.close();
  });

  test("Expired or invalid token shows clear error", async ({ page }) => {
    await page.goto("/accept-invite/totally-invalid-token");
    await expect(page.getByText(/Convite inválido|expirado|revogado/)).toBeVisible();
  });
});
