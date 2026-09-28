# oidc app

## 初回セットアップ

```bash
npm install
npm run db:migrate:local
npm run build
```

`.dev.vars.example`をコピーして名前を`.dev.vars`に変更して下さい。
`.dev.vars` にMaximum IdPで発行した `OIDC_CLIENT_ID` と `OIDC_CLIENT_SECRET` を設定します。

ブラウザでは `http://localhost:5173` を開き、IdPには `http://localhost:5173/auth/callback` を登録します。

## 起動コマンド
```bash
npm run dev
```

## 本番環境の設定

`APP_ORIGIN` は環境ごとに設定します。ローカル値は `.dev.vars` のみに置き、`wrangler.jsonc` にlocalhostを設定しません。`.dev.vars` は本番へデプロイされません。

本番の公開URLが決まったら、次のコマンドでデプロイ先の `APP_ORIGIN` を設定し、プロンプトに公開HTTPS URL（末尾のスラッシュなし）を入力してください。URLは秘密情報ではありませんが、環境固有のBindingとしてWranglerのsecret機能で管理します。

```bash
npx wrangler secret put APP_ORIGIN
npx wrangler secret put OIDC_CLIENT_ID
npx wrangler secret put OIDC_CLIENT_SECRET
```

IdPには本番の `${APP_ORIGIN}/auth/callback` を登録してください。`APP_ORIGIN` が未設定の場合、アプリは設定エラーとなり、localhostへのフォールバックは行いません。

デプロイ前に本番D1を作成し、`wrangler.jsonc` の仮の `database_id` を実際のIDに置き換えます。その後、必要なマイグレーションを確認・適用してデプロイします。

```bash
npx wrangler d1 create oauth-board
```

出力された `database_id` を、`binding: "DB"` の設定に転記してください。既存のD1を利用する場合は `npx wrangler d1 list` で対象DBのIDを確認します。マイグレーションとWorkerが同じDBを参照するよう、この設定を共通で使います。


```bash
npm run db:migrate:remote
npm run build
npm run deploy
```

`0001_remove_posts.sql` は既存の投稿テーブルを削除するため、既存DBでは適用前に保存データを確認してください。
