import { useState } from "react";
import { Navigate } from "react-router";
import { css } from "../../styled-system/css";
import type { SessionState } from "../hooks/use-session.ts";

export function MyPage({ session }: { session: SessionState }) {
  const [failedPicture, setFailedPicture] = useState<string | null>(null);
  if (!session.user) return <Navigate to="/login" replace />;
  return (
    <section
      className={css({
        textAlign: "center",
        paddingTop: "42px",
        "@media (max-width: 540px)": { paddingTop: "32px" },
      })}
      aria-labelledby="profile-title"
    >
      <h1
        className={css({
          margin: "0",
          fontSize: "clamp(28px, 3.1vw, 52px)",
          lineHeight: "1.3",
          letterSpacing: "-0.045em",
          fontWeight: "800",
          color: "#031c1c",
          "@media (max-width: 900px)": { fontSize: "clamp(25px, 4.4vw, 38px)" },
        })}
        id="profile-title"
      >
        マイページ
      </h1>
      <p
        className={css({
          color: "#62718b",
          fontSize: "clamp(15px, 1.15vw, 20px)",
          marginTop: "16px",
        })}
      >
        Maximum ID によるプロフィール情報を確認できます。
      </p>
      <div
        className={css({
          maxWidth: "696px",
          margin: "34px auto 0",
          padding: "38px 28px 28px",
          border: "1px solid #dce4e6",
          borderRadius: "14px",
          background: "white",
          boxShadow: "0 1px 3px #12362b06",
          "@media (max-width: 540px)": { padding: "28px 18px 22px" },
        })}
      >
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "28px",
            "@media (max-width: 540px)": { gap: "16px" },
          })}
        >
          <div
            className={css({
              width: "144px",
              height: "144px",
              flexShrink: "0",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(140deg, #d9f8eb, #a4dfd2)",
              color: "#007756",
              fontSize: "56px",
              fontWeight: "700",
              "@media (max-width: 540px)": {
                width: "72px",
                height: "72px",
                fontSize: "30px",
              },
            })}
            aria-hidden="true"
          >
            {session.user.picture && session.user.picture !== failedPicture ? (
              <img
                className={css({
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "inherit",
                })}
                src={session.user.picture}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setFailedPicture(session.user?.picture ?? null)}
              />
            ) : (
              Array.from(session.user.name.trim())[0] || "M"
            )}
          </div>
          <div className={css({ minWidth: "0", textAlign: "left" })}>
            <h2
              className={css({
                color: "#08242c",
                fontSize: "30px",
                overflowWrap: "anywhere",
                "@media (max-width: 540px)": { fontSize: "22px" },
              })}
            >
              {session.user.name}
            </h2>
            {session.user.displayId && (
              <p
                className={css({
                  marginTop: "4px",
                  color: "#62718b",
                  fontSize: "clamp(15px, 1.3vw, 20px)",
                  overflowWrap: "anywhere",
                })}
              >
                @{session.user.displayId}
              </p>
            )}
            <p
              className={css({
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: "10px",
                color: "#00b978",
                fontSize: "20px",
                marginTop: "18px",
                "@media (max-width: 540px)": {
                  fontSize: "15px",
                  gap: "6px",
                  marginTop: "10px",
                },
              })}
            >
              <span
                className={css({
                  flexShrink: "0",
                  width: "17px",
                  height: "17px",
                  background: "currentColor",
                  borderRadius: "50%",
                })}
                aria-hidden="true"
              />
              現在ログイン中
            </p>
          </div>
        </div>
        <div
          className={css({
            borderTop: "1px solid #dce4e6",
            marginTop: "36px",
            paddingTop: "22px",
          })}
        >
          <button
            className={css({
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "18px",
              minHeight: "58px",
              padding: "14px 32px",
              border: "1px solid #a0cec2",
              borderRadius: "10px",
              font: "inherit",
              fontSize: "18px",
              fontWeight: "700",
              color: "#004533",
              background: "transparent",
              cursor: "pointer",
              textDecoration: "none",
              transition: "background 0.15s",
              _hover: { background: "#edf9f4" },
              _disabled: { opacity: "0.55", cursor: "wait" },
              minWidth: "180px",
            })}
            type="button"
            disabled={session.busy}
            onClick={() => void session.logout()}
          >
            {session.busy ? "処理中…" : "ログアウト"}
          </button>
        </div>
      </div>
    </section>
  );
}
