import { Link } from "react-router";
import { css } from "../../styled-system/css";

export function NotFoundPage() {
  return (
    <>
      <h1
        className={css({
          margin: "0",
          fontSize: "clamp(32px, 4.2vw, 72px)",
          lineHeight: "1.3",
          letterSpacing: "-0.045em",
          fontWeight: "800",
          color: "#031c1c",
        })}
      >
        404
      </h1>
      <p>ページが見つかりません。</p>
      <Link to="/">トップへ戻る</Link>
    </>
  );
}
