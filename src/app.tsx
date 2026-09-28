import {
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router";
import { css } from "../styled-system/css";
import { useSession } from "./hooks/use-session.ts";
import { LoginPage } from "./pages/login.tsx";
import { MyPage } from "./pages/my-page.tsx";
import { NotFoundPage } from "./pages/not-found.tsx";

export function App() {
  const session = useSession();
  const { pathname } = useLocation();
  return (
    <div
      className={css({
        minHeight: "calc(100dvh - 44px)",
        display: "flex",
        flexDirection: "column",
        padding: "0 clamp(24px, 6vw, 102px)",
        borderRadius: "9px",
        background: "#fdfefe",
        "@media (max-width: 540px)": {
          minHeight: "calc(100dvh - 20px)",
          padding: "0 20px",
        },
      })}
    >
      <header
        className={css({
          padding: "26px 0 22px",
          borderBottom: "1px solid #d4dee1",
          "@media (max-width: 540px)": { padding: "20px 0" },
        })}
      >
        <Link
          to="/"
          className={css({
            color: "#003e2e",
            fontSize: "clamp(23px, 2vw, 34px)",
            fontWeight: "750",
            textDecoration: "none",
            letterSpacing: "-0.7px",
          })}
        >
          Maximum Login
        </Link>
      </header>
      <main
        className={css(
          {
            flex: "1",
            display: "flex",
            flexDirection: "column",
            minWidth: "0",
          },
          { justifyContent: pathname === "/my-page" ? "flex-start" : "center" },
        )}
      >
        {session.error && (
          <p
            role="alert"
            className={css({ color: "#a23535", margin: "18px 0" })}
          >
            {session.error}
          </p>
        )}
        <Routes>
          <Route
            element={
              session.loading ? (
                <p role="status">読み込み中…</p>
              ) : session.ready ? (
                <Outlet />
              ) : (
                <div className={css({ padding: "48px 0" })}>
                  <p>ログイン状態を確認できません。再取得してください。</p>
                  <button
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
                      fontSize: "clamp(16px, 1.5vw, 24px)",
                      fontWeight: "700",
                      color: "#004533",
                      background: "transparent",
                      cursor: "pointer",
                      textDecoration: "none",
                      transition: "background 0.15s",
                      _hover: { background: "#edf9f4" },
                      _disabled: { opacity: "0.55", cursor: "wait" },
                      marginTop: "24px",
                    })}
                    type="button"
                    disabled={session.busy}
                    onClick={() => void session.reload()}
                  >
                    ログイン状態を再取得
                  </button>
                </div>
              )
            }
          >
            <Route
              path="/"
              element={
                <Navigate to={session.user ? "/my-page" : "/login"} replace />
              }
            />
            <Route path="/login" element={<LoginPage session={session} />} />
            <Route path="/my-page" element={<MyPage session={session} />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer
        className={css(
          {
            padding: "28px 0 40px",
            fontSize: "15px",
            color: "#71809a",
            "@media (max-width: 540px)": {
              fontSize: "12px",
              paddingBottom: "24px",
            },
          },
          pathname === "/my-page" && {
            textAlign: "center",
            paddingTop: "30px",
          },
        )}
      >
        Maximum Login · OAuth / OpenID Connect
      </footer>
    </div>
  );
}
