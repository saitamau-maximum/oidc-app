# use-session.tsのフロー解説


## 1. useSessionとは

`useSession` は、現在ログインしているユーザーの情報取得とログアウト処理をまとめたカスタムフックです。

このフックでは主に、次の2つの処理を行っています。

- `/api/me` から現在のログイン状態を取得する
- `/auth/logout` にリクエストを送り、ログアウトする

全体の流れは次のようになります。

1. `useSession()`を呼び出す
2. `/api/me` にアクセス
3. ログイン状態を取得
4. `user / loading / error` などに整理して返す
5. ログアウト時
6. **POST** `/auth/logout`
7. 古い `/api/me` の通信をキャンセル
8. キャッシュ上の `user` を `null` にする
9. `/api/me` を再取得


## 2. Query Keyの定義

```ts
const meQueryKey = ["me"] as const;
```

`meQueryKey` は、React Query上でユーザー情報を識別するためのキーです。

このコードでは、`["me"]`というキーに `/api/me` から取得したデータが保存されます。

`as const` を付けることで、TypeScriptでは単なる配列ではなく、固定された値として扱われます。


## 3. 現在のログイン状態を取得する

```ts
const meQuery = useQuery({
  queryKey: meQueryKey,
  queryFn: ({ signal }) => api<MeResponse>("/api/me", { signal }),
  retry: false,
});
```

`useSession()` が使用されると、`useQuery` によって `/api/me` にリクエストが送られます。

```http
GET /api/me
```

ブラウザに保存されているCookieも送られるため、サーバー側ではCookieからセッションを確認できます。

ログインしている場合は、例えば次のようなデータが返ります。

```ts
{
  user: {
    id: "123",
    name: "Alice"
  },
  loginConfigured: true
}
```

ログインしていない場合は、次のようになります。

```ts
{
  user: null,
  loginConfigured: true
}
```

つまり、フロントエンドが自分でログイン状態を判断するのではなく、サーバーに問い合わせて現在の状態を確認しています。


### 3.1 signal

```ts
queryFn: ({ signal }) =>
  api<MeResponse>("/api/me", { signal }),
```

`signal` は、通信を途中でキャンセルするための `AbortSignal` です。

React Queryがリクエストをキャンセルした場合、この `signal` を通して実際のHTTP通信も停止できます。

このコードでは、ログアウト時に古い `/api/me` の通信を止めるために利用されています。


### 3.2 retry: false

```ts
retry: false,
```

`/api/me` の取得に失敗しても、自動的に再試行しない設定です。

セッション確認に失敗したときに何度も `/api/me` へリクエストを送ることを防いでいます。


## 6. ログアウト処理

```ts
const logoutMutation = useMutation({
  mutationFn: () =>
    api<void>("/auth/logout", { method: "POST" }),

  onSuccess: async () => {
    ...
  },
});
```

ログアウトでは、次のリクエストを送ります。

```http
POST /auth/logout
```

サーバー側では、このリクエストを受け取るとセッションの削除やCookieの無効化などを行います。

ログアウトに成功すると、`onSuccess` が実行されます。


## 6.1 古い `/api/me` の通信をキャンセルする

```ts
await queryClient.cancelQueries({ queryKey: meQueryKey, });
```

ログアウト前から `/api/me` の通信が実行されている場合、その通信をキャンセルします。

例えば次のような状況を防ぎます。

```text
/api/me を送信
   ↓
まだレスポンス待ち
   ↓
ログアウト
   ↓
ログアウト成功
   ↓
古い /api/me のレスポンスが返る
```

古いレスポンスにログイン中のユーザー情報が含まれていた場合、ログアウト後にユーザー情報が再びキャッシュへ保存されてしまう可能性があります。

そのため、

```ts
cancelQueries()
```

によってログアウト前の通信を停止します。

## 6.2 キャッシュ上のuserをnullにする

```ts
queryClient.setQueryData<MeResponse>(
  meQueryKey,
  (previous) =>
    previous
      ? { ...previous, user: null }
      : undefined,
);
```

React Queryに保存されているユーザー情報を直接変更しています。

例えば、

```ts
{
  user: {
    id: "123",
    name: "Alice"
  },
  loginConfigured: true
}
```

というデータが保存されていた場合、

```ts
{
  user: null,
  loginConfigured: true
}
```

に変更されます。

```ts
{ ...previous, user: null }
```

では、以前のデータを残したまま `user` だけを `null` にしています。

これにより、ログアウト成功後すぐに画面を未ログイン状態へ変更できます。


## 6.3 `/api/me` を再取得する

```ts
await queryClient.invalidateQueries({
  queryKey: meQueryKey,
});
```

`invalidateQueries` によって、`["me"]` のデータを古いものとして扱います。

現在このQueryが使用されている場合、`/api/me` が再度実行されます。

```text
ログアウト完了
   ↓
キャッシュの user を null
   ↓
invalidateQueries()
   ↓
GET /api/me
   ↓
サーバーでもログアウト済みであることを確認
```

この処理によって、フロントエンドの状態とサーバーの状態を同期しています。


## 10. ログアウト時の3つの処理

ログアウト成功後には、次の3つの処理を順番に行っています。

```ts
await queryClient.cancelQueries(...)
queryClient.setQueryData(...)
await queryClient.invalidateQueries(...)
```

それぞれの役割は次のようになります。

| 処理 | 役割 |
|---|---|
| `cancelQueries` | ログアウト前の古い通信を止める |
| `setQueryData` | 画面をすぐに未ログイン状態にする |
| `invalidateQueries` | サーバーから最新の状態を再取得する |


## 11. reload

```ts
function reload() {
  logoutMutation.reset();
  return meQuery.refetch();
}
```

`reload()` は、現在のセッション状態を手動で再確認するための関数です。

最初に以下を実行し、ログアウト処理のエラーや成功状態などを初期化します。
```ts
logoutMutation.reset();
```

その後、以下によって `/api/me` を再取得します。

```ts
meQuery.refetch();
```

```text
reload()
   ↓
ログアウトMutationの状態をリセット
   ↓
GET /api/me
   ↓
現在のログイン状態を再確認
```


## 12. useSessionが返す値

最後に、取得した情報をコンポーネントから使いやすい形にして返しています。

```ts
return {
  user: meQuery.data?.user ?? null,
  configured: meQuery.data?.loginConfigured ?? false,
  loading: !meQuery.isFetched,
  ready: meQuery.isSuccess,
  busy: meQuery.isFetching || logoutMutation.isPending,
  error: (logoutMutation.error ?? meQuery.error)?.message ?? "",
  reload,
  logout: () => logoutMutation.mutate(),
};
```

### user

```ts
user: meQuery.data?.user ?? null
```

現在ログインしているユーザーです。

データをまだ取得していない場合や未ログインの場合は `null` になります。

### configured

```ts
configured: meQuery.data?.loginConfigured ?? false
```

ログイン機能が設定されているかを表します。

### loading

```ts
loading: !meQuery.isFetched
```
一度も `/api/me` の取得が完了していない場合に `true` になります。

### ready

```ts
ready: meQuery.isSuccess
```
`/api/me` の取得に成功していれば `true` になります。

### busy

```ts
busy: meQuery.isFetching || logoutMutation.isPending
```
ユーザー情報取得中、またはログアウト処理中なら `true` になります。

### error

```ts
error:
  (logoutMutation.error ?? meQuery.error)?.message ?? ""
```
ログアウトまたはユーザー情報取得時に発生したエラーメッセージを返します。

### reload

```ts
reload
```
現在のセッション状態を再取得する関数です。

### logout

```ts
logout: () => logoutMutation.mutate()
```

ログアウト処理を開始します。

コンポーネント側では、

```ts
session.logout();
```

のように使用できます。
