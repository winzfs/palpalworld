"use client";

import { useEffect, useMemo } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[PalPalWorld global error]", error);
  }, [error]);

  const details = useMemo(() => {
    const message = error?.message || "Unknown client-side error";
    const name = error?.name || "Error";
    const digest = error?.digest ? `\nDigest: ${error.digest}` : "";
    const stack = error?.stack ? `\n\n${error.stack}` : "";
    return `${name}: ${message}${digest}${stack}`;
  }, [error]);

  return (
    <html lang="ko">
      <body style={{ margin: 0, background: "#0f172a", color: "#e5e7eb", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" }}>
        <main style={{ minHeight: "100vh", padding: 20, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <section style={{ width: "min(720px, 100%)", border: "1px solid rgba(248,113,113,0.45)", background: "rgba(15,23,42,0.96)", borderRadius: 18, padding: 18, boxShadow: "0 24px 80px rgba(0,0,0,0.45)" }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 22, color: "#fca5a5" }}>클라이언트 오류가 발생했습니다</h1>
            <p style={{ margin: "0 0 14px", lineHeight: 1.55, color: "#cbd5e1" }}>
              모바일에서도 원인을 확인할 수 있도록 실제 오류 메시지를 표시합니다. 아래 내용을 복사해서 보내주세요.
            </p>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: "52vh", overflow: "auto", margin: 0, padding: 12, borderRadius: 12, background: "#020617", color: "#f8fafc", fontSize: 12, lineHeight: 1.45 }}>
              {details}
            </pre>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button onClick={() => reset()} style={{ border: 0, borderRadius: 999, padding: "10px 14px", background: "#38bdf8", color: "#082f49", fontWeight: 800 }}>
                다시 시도
              </button>
              <button onClick={() => window.location.reload()} style={{ border: "1px solid rgba(148,163,184,0.45)", borderRadius: 999, padding: "10px 14px", background: "transparent", color: "#e5e7eb", fontWeight: 700 }}>
                새로고침
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
