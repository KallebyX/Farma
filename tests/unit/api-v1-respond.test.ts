import { describe, it, expect } from "vitest";
import { ok, fail, paginated, preflight } from "@/lib/api/v1/respond";

function reqWithOrigin(origin?: string): Request {
  return new Request("https://api.example/api/v1/x", {
    headers: origin ? { origin } : {},
  });
}

describe("api/v1 respond envelope", () => {
  it("ok() wraps data with ok:true and default 200", async () => {
    const res = ok(reqWithOrigin("https://app.meuprontuario"), { a: 1 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, data: { a: 1 } });
  });

  it("ok() honors a custom status", () => {
    expect(ok(reqWithOrigin(), { x: 1 }, 201).status).toBe(201);
  });

  it("fail() returns ok:false with the given status", async () => {
    const res = fail(reqWithOrigin(), "Sessão inválida", 401);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "Sessão inválida" });
  });

  it("paginated() includes nextCursor (null by default)", async () => {
    const res = paginated(reqWithOrigin(), [1, 2, 3]);
    expect(await res.json()).toEqual({ ok: true, data: [1, 2, 3], nextCursor: null });
  });

  it("paginated() passes a provided cursor", async () => {
    const res = paginated(reqWithOrigin(), [1], "cur_2");
    expect((await res.json()).nextCursor).toBe("cur_2");
  });
});

describe("api/v1 CORS", () => {
  it("reflects the request origin", () => {
    const res = ok(reqWithOrigin("https://app.meuprontuario"), {});
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://app.meuprontuario");
    expect(res.headers.get("Vary")).toBe("Origin");
  });

  it("falls back to * when no origin (native apps)", () => {
    expect(ok(reqWithOrigin(), {}).headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("preflight() is a 204 with the allowed methods/headers", () => {
    const res = preflight(reqWithOrigin("https://app.meuprontuario"));
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("PATCH");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });
});
