import { Navigate, useSearchParams } from "react-router";
import { css } from "../../styled-system/css";
import type { SessionState } from "../hooks/use-session.ts";

export function LoginPage({ session }: { session: SessionState }) {
  const [params] = useSearchParams();
  if (session.user) return <Navigate to="/my-page" replace />;
  const failure = params.get("error");
  return (
    <section
      className={css({
        display: "grid",
        width: "90%",
        marginInline: "auto",
        gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 26%)",
        gap: "clamp(28px, 3.5vw, 64px)",
        alignItems: "center",
        padding: "70px 0 95px",
        "@media (max-width: 900px)": {
          gridTemplateColumns: "1fr",
          padding: "48px 0",
          gap: "40px",
        },
      })}
      aria-labelledby="login-title"
    >
      <div className={css({ width: "100%", minWidth: "0" })}>
        <h1
          className={css({
            margin: "0",
            fontSize: "clamp(28px, 3.1vw, 52px)",
            lineHeight: "1.3",
            letterSpacing: "-0.045em",
            fontWeight: "800",
            color: "#031c1c",
            "@media (max-width: 900px)": {
              fontSize: "clamp(25px, 4.4vw, 38px)",
            },
          })}
          id="login-title"
        >
          Maximum IdPでログイン
        </h1>
        <p
          className={css({
            marginTop: "26px",
            color: "#5e6b88",
            fontSize: "clamp(15px, 1.15vw, 20px)",
            lineHeight: "1.7",
          })}
        >
          Maximum ID を利用した OAuth / OpenID Connect のサンプルアプリです。
          <br />
          ログインとセッションの仕組みを体験しながら学ぶことができます。
        </p>
        {failure && (
          <p
            role="alert"
            className={css({ color: "#a23535", margin: "18px 0" })}
          >
            {failure === "configuration"
              ? "ログイン設定が不足しています。"
              : "ログインできませんでした。もう一度お試しください。"}
          </p>
        )}
        <div
          className={css({
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
            marginTop: "48px",
            "@media (max-width: 540px)": {
              flexDirection: "column",
              marginTop: "28px",
              gap: "14px",
            },
          })}
        >
          {session.configured ? (
            <a
              href="/auth/login"
              className={css({
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "18px",
                minHeight: "64px",
                padding: "14px 32px",
                border: "1px solid #a0cec2",
                borderRadius: "10px",
                font: "inherit",
                fontSize: "clamp(15px, 1.15vw, 19px)",
                fontWeight: "700",
                color: "white",
                background: "#008362",
                cursor: "pointer",
                textDecoration: "none",
                transition: "background 0.15s",
                _hover: { background: "#006f52" },
                _disabled: { opacity: "0.55", cursor: "wait" },
                borderColor: "#008362",
                minWidth: "270px",
                "@media (max-width: 540px)": { minWidth: "0" },
              })}
            >
              Maximumでログイン <span aria-hidden="true">→</span>
            </a>
          ) : (
            <p role="status">ログインの準備ができていません。</p>
          )}
        </div>
      </div>
      <div
        className={css({
          aspectRatio: "1",
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          background: "#e7f8f1",
          "@media (max-width: 900px)": { width: "220px", margin: "auto" },
        })}
      >
        <img
          className={css({ display: "block", width: "74%", height: "auto" })}
          src="/Maximum-logo.svg"
          alt="Maximum — Saitama University"
        />
      </div>
    </section>
  );
}
