"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#FAFBFC", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ maxWidth: 400, width: "100%", textAlign: "center", background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 32, boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>
              Erro inesperado
            </h1>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
              Algo falhou ao carregar a aplicação.
              {error.digest && (
                <span style={{ display: "block", marginTop: 4, fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>
                  Código: {error.digest}
                </span>
              )}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={reset}
                style={{ padding: "8px 16px", background: "#0ABF77", color: "white", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
              >
                Tentar novamente
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                style={{ padding: "8px 16px", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 8, fontSize: 13, textDecoration: "none" }}
              >
                Página inicial
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
