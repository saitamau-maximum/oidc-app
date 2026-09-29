# TanStack React Queryとは

TanStack React Queryは、Reactでサーバーから取得するデータを扱いやすくするためのライブラリです。

[package.json](パスを書く)でインストールしています。

## 1. React標準のfetch

React Queryを使わなくても、ReactだけでAPIからデータを取得することはできます。

例えば、useEffect と useState を使う方法があります。

```ts
const [users, setUsers] = useState([]);

useEffect(() => {
  fetch("/api/users")
    .then((res) => res.json())
    .then((data) => setUsers(data));
}, []);
```
一応解説します。

`useEffect`は依存配列がからなので最初の画面描画が終わった後にAPIを叩くという役割だけです。
`useState`は`setUsers`が実行されるごとに再レンダリング(画面をリロード)します。

1. **初回レンダリング（1回目の描画）**
* `useState([])` により、最初は `users` が空配列 `[]` の状態でコンポーネントがレンダリングされ、画面に初期表示されます。

2. `useEffect` の実行
* 依存配列が []（空）になっているため、「初回の画面描画が完了した直後」 に `useEffect` 内のコード（fetch 処理）が1回だけ動きます。

3. **データ取得とステート更新**
* サーバーから非同期でデータが返ってきたら、`.then((data) => setUsers(data))` の部分で `setUsers` が実行されます。

4. 再レンダリング（2回目の描画 → 画面更新）
* `React` は `setUsers` が呼ばれたことで「ステート（users）が変化した」 ことを検知します。
* コンポーネントが再実行され、今度は取得した data が入った新しい users を使って画面が再描画されます。


一見これでよさそうに見えますが、エラーメッセージ・ローディングなどを実装するとなるとたくさんの情報を保持しなければなりません。そこで`TanStack React Query`が便利です。

ちなみに[use-session.ts](./use-session.ts)を標準のフックを使って実装するとこうなります。

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { MeResponse } from "../../schema/api/session.ts";
import { api } from "../lib/api.ts";

export function useSession() {
  const [data, setData] = useState<MeResponse>();
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSession = useCallback(async () => {
    abortControllerRef.current?.abort();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setFetching(true);
    setError("");

    try {
      const response = await api<MeResponse>("/api/me", {
        signal: abortController.signal,
      });
      setData(response);
    } catch (error) {
      if (!abortController.signal.aborted) {
        setError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
        setFetching(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchSession();

    return () => abortControllerRef.current?.abort();
  }, [fetchSession]);

  const reload = useCallback(() => fetchSession(), [fetchSession]);

  const logout = useCallback(async () => {
    setLoggingOut(true);
    setError("");

    try {
      await api<void>("/auth/logout", { method: "POST" });

      // ログアウト前に開始した通信の結果でユーザー情報が戻らないようにする。
      abortControllerRef.current?.abort();
      setData((previous) =>
        previous ? { ...previous, user: null } : undefined,
      );
      await fetchSession();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoggingOut(false);
    }
  }, [fetchSession]);

  return {
    user: data?.user ?? null,
    configured: data?.loginConfigured ?? false,
    loading,
    ready: data !== undefined,
    busy: fetching || loggingOut,
    error,
    reload,
    logout: () => void logout(),
  };
}

export type SessionState = ReturnType<typeof useSession>;
```


## 2. useQueryとは

`useQuery`は**サーバーからデータを取得して、その状態もまとめて管理するためのフック**です。

例えば　`GET /api/users` の情報を取得したいとします。

ほぼ再掲ですが、このような内容を書くとします。
```ts
const [users, setUsers] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  fetch("/api/users")
    .then((res) => res.json())
    .then((data) => setUsers(data))
    .catch((err) => setError(err))
    .finally(() => setIsLoading(false));
}, []);
```

`useQuery`ではこれらの情報を`userQuery`に一つにまとめて管理できます。
```ts
const userQuery  = useQuery({
  queryKey: ["users"],
  queryFn: async () => {
    const res = await fetch("/api/users");
    return res.json();
  },
});
```

重要なのは以下の２つです。
`queryKey`については後で解説します。[Todo](このファイル内のパスを書きたい)
```ts
queryKey: ["users"]
queryFn: async () => {
  // データを取得する処理
}
```


### 2.1 queryFn

まずは`queryFn`から解説します。
queryFn は、**実際にデータを取得する処理してその結果を返す処理を書く場所**です。
例えばAPIからデータを取得する場合は、fetch() などを使ってリクエストを送り、取得したデータを返します。


### 2.2 取得したデータ

取得したデータは例えば以下のコードだと`userQuery`に格納されます。
他のコードでは異なります。
```ts
const userQuery  = useQuery({
  // 取得する処理
});
```

取得したデータは例えば`userQuery.data`といったように使えます
`userQuery.data`の中身：
```ts
[
  { "id": 1, "name": "Alice" },
  { "id": 2, "name": "Bob" }
]
```

他には`userQuery`では以下のようなものが取得できます。
| プロパティ | 意味 |
|---|---|
| `data` | `queryFn` が返したデータ |
| `error` | 発生したエラー |
| `isPending` | 最初のデータ取得待ちか |
| `isFetching` | 現在通信中か |
| `isError` | 取得に失敗したか |
| `isSuccess` | 取得に成功したか |


別の書き方としてこのような書き方ができます。
個別に取得できます
```ts
const {
  data,
  isPending,
  error,
} = useQuery({
  queryKey: ["posts"],
  queryFn: fetchPosts,
});
```

改名もできます。
```ts
const {
  data: users,
} = useQuery({
  queryKey: ["members"],
  queryFn: fetchUsers,
});
```


## 3. useQueryClientとは

`useQueryClient` は、**React Query が管理しているキャッシュを直接操作するための `QueryClient` を取得するフック**です。

まず、操作の前に次を書いておきます。
```ts
const queryClient = useQueryClient();
```


### 3.1 キャッシュについて

Reactにおいて普通の変数は再レンダリングのたびに作りなおされます。
`count`は再レンダリングのたびに0になります。
```ts
function App() {
  let count = 0;

  return <div>{count}</div>;
}
```

一方で`useState`は、再レンダーされても値を保持します。

`usersQuery` という変数自体は再レンダーのたびに作り直されます。
```ts
const usersQuery = useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
});
```
ただし、`["users"]` に対応するキャッシュは `QueryClient` 側で管理されています。


### 3.2 queryKeyについて

`QueryClient` でキャッシュを操作するときは、どのデータを操作するのかを指定する必要があります。
そのために使うのが `queryKey` です。
例えば、
```ts
useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
});
```
とした場合、React Query は取得したデータを `["users"]` という `queryKey` で管理します。

そのため、
```ts
queryClient.invalidateQueries({ queryKey: ["users"], });
```
と書けば、`["users"]` として管理されているデータを操作する

という意味になります。
つまり、`queryKey` は、`React Query` がキャッシュ内のデータを識別するためのキーです。


### 3.3 `useQueryClient`の操作一覧

1. `queryClient.cancelQueries({ queryKey })`

* **概要**: 現在実行中（フェッチ中）のクエリ通信を中断します。
* **このコードでの目的**: ログアウト処理を行っている最中に、裏で走っていた /api/me のレスポンスが後から届いて「ログアウトしたのに古いユーザー情報で上書きされる（レースコンディション）」を防ぐために、通信を打ち切っています。


2. `queryClient.setQueryData(queryKey, updater)`

* **概要**: APIを叩かずに、**キャッシュ内にあるデータを手動で直接書き換える**関数です。
* **このコードでの目的**: サーバーからの応答を待たずに、キャッシュ内の `user` を即座に `null` に変更して、**画面をフリーズさせず一瞬で未ログイン表示に切り替える**ために使っています。


3. `queryClient.invalidateQueries({ queryKey })`
* **概要**: 指定したキャッシュを「古い（stale）」とマークし、必要に応じて裏で再取得（refetch）を走らせます。
* **このコードでの目的**: キャッシュを手動変更した後に、**「サーバー側の最新状態（ログアウト完了後のステータス）」と最終的な同期をとる**ために呼び出しています。


## 4. useMutationとは

`useMutation` は、**サーバー側のデータや状態を変更する処理を管理するためのフック**です。

`useQuery` が主に**取得**に使われるのに対して、`useMutation` は**変更**に使う、と考えると分かりやすいです。

* `useQuery`: GET
* `useMutation`: POST, PUT DELETE

`useMutation` の基本形は次のようになります。
```ts
const mutation = useMutation({
  mutationFn: async () => {
    // サーバーに変更を送る処理
  },
});
```

ここで一番重要なのが `mutationFn` です。
```ts
const mutation = useMutation({
  mutationFn: () =>
    fetch("/auth/logout", {
      method: "POST",
    }),
});
```
これは、**mutation を実行したときに、実際に何をするか**を書く場所です。

このままでは`mutation`は実行されず、以下のようなコードを実行する必要があります。
```ts
mutation.mutate()
```

`useMutation()` が返すオブジェクトには、**Mutationを実行したり、状態を確認、リセットしたりするためのプロパティや関数**があります。
| 名前 | 役割 |
|---|---|
| `mutate()` | Mutationを実行する |
| `mutateAsync()` | PromiseとしてMutationを実行する |
| `reset()` | Mutationの状態を初期状態に戻す |
| `isPending` | 実行中か |
| `isSuccess` | 成功したか |
| `isError` | 失敗したか |
| `error` | エラー内容 |
| `data` | Mutation成功時の返り値 |


また、`useMutation` では、処理が成功した後に何をするかも書けます。
それが `onSuccess` です。
```ts
const logoutMutation = useMutation({
  mutationFn: () =>
    api<void>("/auth/logout", {
      method: "POST",
    }),

  onSuccess: async () => {
    // 成功後の処理
  },
});
```

つまり、以下のような順番です。
```txt
mutation.mutate()
↓
mutationFn 実行
↓
POST /auth/logout
↓
成功
↓
onSuccess 実行
```


### 4.1 `mutate()`

`mutate()` は、**Mutationを実行するための関数**です。

例えば、
```ts
const logoutMutation = useMutation({
  mutationFn: () =>
    fetch("/auth/logout", {
      method: "POST",
    }),
});
```

と定義しただけでは、まだ `/auth/logout` への通信は実行されません。

実際に実行するときに、

```ts
logoutMutation.mutate();
```

とします。

すると、`mutate()`→`mutationFn` が実行される → `POST /auth/logout`という流れになります。

また、処理に成功した場合は `onSuccess` が実行されます。

```ts
const logoutMutation = useMutation({
  mutationFn: () =>
    fetch("/auth/logout", {
      method: "POST",
    }),

  onSuccess: () => {
    console.log("ログアウト成功");
  },
});
```

この場合は、
```txt
logoutMutation.mutate()
↓
mutationFn 実行
↓
通信成功
↓
onSuccess 実行
```

という順番です。


### 4.2 `mutateAsync()`

`mutateAsync()` もMutationを実行する関数ですが、`mutate()` との違いは、**Promiseを返すため `await` できること**です。

まず、Mutationを定義します。

```ts
const createUserMutation = useMutation({
  mutationFn: async (name: string) => {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    return response.json();
  },
});
```

このMutationは、ユーザー名を受け取って新しいユーザーを作成する処理です。

例えば、

```ts
await createUserMutation.mutateAsync("Alice");
```

と実行すると、以下の流れになります。

1. mutateAsync("Alice")
2. mutationFn("Alice") が実行される
3. POST /api/users
4. 処理が完了するまで待つ
5. 結果が返る

また、`mutateAsync()` はMutationの結果を受け取ることもできます。

```ts
const user = await createUserMutation.mutateAsync("Alice");

console.log(user);
```

APIが次のようなデータを返した場合、

```json
{
  "id": 1,
  "name": "Alice"
}
```

`user` にはその値が入ります。

```ts
console.log(user.name);
// Alice
```

このように、Mutationの結果を使って次の処理をしたい場合に `mutateAsync()` が便利です。

例えば、

```ts
async function handleCreateUser() {
  const user = await createUserMutation.mutateAsync("Alice");

  console.log(`${user.name} を作成しました`);
}
```

と書けば、

1. ユーザー作成
2. 完了するまで待つ
3. 作成されたユーザー情報を受け取る
4. 次の処理を実行

という流れになります。


### 4.3 `reset()`

`reset()` は、**Mutationの状態を初期状態に戻すための関数**です。

例えばMutationに失敗すると、

`isError = true`  
`error = エラー情報`

という状態になります。

この状態で、

```ts
mutation.reset();
```

を実行すると、

`isError = false`
`error = null`
`data = undefined`

のように、Mutationの状態が初期状態に戻ります。

例えば、

```tsx
{mutation.isError && (
  <div>
    <p>処理に失敗しました</p>

    <button onClick={() => mutation.reset()}>
      閉じる
    </button>
  </div>
)}
```

のように、エラー表示を閉じるときに利用できます。

注意点として、`reset()` は、**実行中の通信をキャンセルする**ための関数ではありません。

あくまで、

```txt
Mutationが持っている
data
error
成功・失敗などの状態
```

を初期状態に戻すための関数です。
