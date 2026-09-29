# `api` 関数とは

[api.ts](./api.ts) の `api` 関数は、ブラウザ標準の `fetch` を使いやすくするためのラッパー関数です。

```ts
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(
      result?.error ?? "通信に失敗しました。再度お試しください。",
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
```

## 引数と戻り値

```ts
api<T>(path, init)
```

- `T` は、APIから返ってくるデータの型です。
`T` は ジェネリクス（Generics） と呼ばれるもので、`api()` を呼び出すときに**このAPIの返り値はこの型です**と指定できます。
- `path` は、リクエスト先のURLです。
- `init` は省略可能で、HTTPメソッド、ヘッダー、リクエストボディなどを指定する `fetch` の設定です。
- 戻り値は `Promise<T>` です。通信が完了すると、指定した `T` 型のデータを取得できます。

例えば、`/api/me` が `MeResponse` 型のJSONを返す場合は次のように呼び出します。
```ts
export type SessionUser = {
  id: string;
  name: string;
  displayId?: string | null;
  picture?: string | null;
};

export type MeResponse = {
  user: SessionUser | null;
  loginConfigured: boolean;
};

const result = await api<MeResponse>("/api/me");
```

POSTリクエストの場合は、第2引数に設定を渡します。

```ts
await api<void>("/auth/logout", { method: "POST" });
```

## 処理の流れ

### 1. APIへリクエストを送る

```ts
const response = await fetch(path, init);
```

`fetch` でリクエストを送り、レスポンスが返るまで `await` で待ちます。

なお、`fetch` は404や500などのHTTPエラーが返っても、それだけでは例外を投げません。そのため、次の処理でステータスを確認する必要があります。


### 2. HTTPエラーを確認する

```ts
if (!response.ok) {
```

`response.ok` は、HTTPステータスが200番台なら `true`、それ以外なら `false` になります。


### 3. サーバーのエラーメッセージを取得する

```ts
const result = await response.json().catch(() => null);
```

エラーレスポンスをJSONとして読み取ります。レスポンスがJSONではなく読み取りに失敗した場合は、`catch` によって `null` を代入します。

```ts
throw new Error(
  result?.error ?? "通信に失敗しました。再度お試しください。",
);
```

`result?.error`について
`result` が `null` または `undefined` でなければ `result.error` を取得し、
`null` または `undefined` なら `undefined` を返します。

`??`Null合体演算子について
```ts
result?.error ?? "通信に失敗しました。再度お試しください。"
```
左側が `null` または `undefined` なら、右側を使うという意味です。

つまり、`result.error` が存在する場合、そのエラーメッセージを使う。
`result.error` が `null / undefined`なら「通信に失敗しました。再度お試しください。」を使うかたちになります。

この例外は、呼び出し側の `try...catch` やTanStack React Queryの `error` で受け取れます。


### 4. 成功時のデータを返す

```ts
return response.status === 204 ? (undefined as T) : response.json();
```

これには三項演算子を使っています。`条件 ? A : B`
条件が正なら`A`を使って誤なら`B`になります。
`if` で書くと、ほぼ同じです。
```ts
if (response.status === 204) {
  return undefined as T;
} else {
  return response.json();
}
```

- ステータスが `204 No Content` の場合は、レスポンス本文がないため `undefined` を返します。
- それ以外の場合は、レスポンス本文をJSONとして読み取り、呼び出し元へ返します。

`api<void>(...)` のように戻り値の型へ `void` を指定することで、204を返すAPIにも同じ関数を使用できます。