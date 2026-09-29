# TypeScriptのジェネリクス

## 関数の引数

復習でTSでの関数の型を見ておきます。
```ts
function add(a: <引数の型>, b: <引数の型>): <返り値の型> {}
function add(a: number, b: number): number {}
```



## ジェネリクス概要

ジェネリクスは、具体的な型をあとから指定できるようにする仕組みです。ジェネリクスを読むときは、必ず次の2つを組にして考えます。

1. **型を受け取る側（定義側）**：`<T>` のような型パラメーターを宣言する。
2. **型を提供する側（利用側）**：`<string>` のような具体的な型引数を渡す。

```ts
// 型を受け取る側
function identity<T>(value: T): T {
  return value;
}

// 型を提供する側
const result = identity<string>("hello");
```
この例では、利用側が提供した `string` が定義側の `T` に入ります。
ジェネリクスは型の引数が一つ増えたイメージです。



## ジェネリクスが必要になる理由

受け取った値をそのまま返す関数を考えます。

```ts
function identity(value: string): string {
  return value;
}
```

この関数は文字列にしか使えません。数値にも対応させるために `any` を使うと、入力した型の情報が失われます。
```ts
function identity(value: any): any {
  return value;
}

// resultはanyになる
const result = identity("hello");
```

ジェネリクスを使うと、型の安全性を保ったまま複数の型へ対応できます。次のコードでは、定義側と利用側を同時に示しています。
```ts
// 型を受け取る側：Tを受け取り、引数と戻り値に使う
function identity<T>(value: T): T {
  return value;
}

// 型を提供する側：Tへ具体的な型を渡す
const text = identity<string>("hello"); // string
const count = identity<number>(10);      // number
```

ここで `T` は、あとから具体的な型が入る型の変数です。`T` という名前に特別な機能があるわけではありませんが、Typeを表す慣習的な名前としてよく使われます。


## 型パラメーターと型引数

ジェネリクスを定義する側と利用する側では、山括弧の中身の呼び方が異なります。

```ts
// こっちの<T>は型パラメータ
function identity<T>(value: T): T {
  return value;
}

// こっちの<string><number>は型引数
identity<string>("hello");
identity<number>(123);
```



## 型を明示せずに提供する「型推論」

TypeScriptが値の引数から型を判断できる場合、利用側は型引数を明示せずに型を提供できます。
```ts
// 受け取る側
function identity<T>(value: T): T {
  return value;
}

// 提供する側：<string>と<number>は省略されている
const text = identity("hello"); // Tはstringと推論される
const count = identity(10);      // Tはnumberと推論される
```

この場合も受け取る側と提供する側がなくなったわけではありません。TypeScriptが `"hello"` から `string` を推論し、利用者の代わりに `T` へ提供しています。

型引数を明示する必要があるのは、TypeScriptが型を判断できない場合や、利用側が期待する型を指定したい場合です。



## このリポジトリの `api<T>`

[src/lib/api.ts](./src/lib/api.ts) では、APIレスポンスの型を呼び出し側から指定できるようにしています。


### 型を受け取る側：`api<T>` の定義

```ts
export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
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

`<T>` で型を受け取り、その型を戻り値の `Promise<T>` へ使用しています。この関数にとってレスポンスの具体的な型は呼び出されるまで分からないため、受け取った `T` と実際の戻り値を結び付けています。


### 型を提供する側：ユーザー情報を取得する場合

```ts
const response = await api<MeResponse>("/api/me");
```

呼び出し側が `MeResponse` を提供するため、定義側の `T` が `MeResponse` に置き換わります。

`await` するとPromiseの中身が取り出されるため、`response` は `MeResponse` 型になります。


### 型を提供する側：レスポンス本文がない場合

```ts
await api<void>("/auth/logout", { method: "POST" });
```

ログアウトAPIは `204 No Content` を返すため、利用するデータがありません。そこで利用側が型引数として `void` を提供します。



## `Hono<AppEnv>`

[server/routes/oauth.ts](./server/routes/oauth.ts) では、Honoルーターを次のように生成しています。

`Hono` は、利用する環境の型を型引数として受け取れるジェネリックなクラスです。


### 型を受け取る側：Honoライブラリ

実際の定義はHonoライブラリ内にありますが、ジェネリクスの関係だけに注目すると、概念的には次のようなクラスだと考えられます。

```ts
class Hono<TEnvironment> {
  // TEnvironmentを利用してContextなどを型付けする
}
```

Hono側は `TEnvironment` という型パラメーターを宣言し、利用するアプリから環境の型を受け取ります。

### 型を提供する側：このリポジトリ

このリポジトリは、Hono側の `TEnvironment` に `AppEnv` を提供しています。

```ts
const router = new Hono<AppEnv>();
```

`AppEnv` は [server/env.ts](./server/env.ts) で定義されています。

```ts
export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    repositories: Repositories;
    config: Config;
  };
};
```

両者の対応は次のようになります。

```text
提供する側: new Hono<AppEnv>()
                         ↓
受け取る側: class Hono<TEnvironment>
                         ↓
TEnvironment = AppEnv
                         ↓
ルート内のContextへAppEnvの型が伝わる
```

`AppEnv` をHonoへ渡すことで、ルート内のコンテキスト `c` が型付けされます。

```ts
router.get("/login", async (c) => {
  const config = c.get("config");
  const repositories = c.get("repositories");
});
```

TypeScriptは次のことを把握できます。

- `c.env.DB` は `D1Database` である。
- `c.env.APP_ORIGIN` は `string` である。
- `c.get("config")` は `Config` を返す。
- `c.get("repositories")` は `Repositories` を返す。
- 定義されていない名前を `c.get()` に渡すと型エラーになる。

### 型を渡すだけでは値は作られない

```ts
const router = new Hono<AppEnv>();
```

このコードは、`config` や `repositories` の実際の値を生成するものではありません。`AppEnv` は、利用できる値の型をTypeScriptへ伝えているだけです。

実際の値は [server/app.ts](./server/app.ts) のミドルウェアが設定します。

```ts
c.set("config", {
  // 環境変数から作った設定
});

c.set("repositories", createRepositories(c.env.DB));
```

したがって、次の2つがそろって初めて安全に利用できます。

```text
AppEnvによる型の宣言
        ＋
c.set()による実際の値の設定
```

## `Context<AppEnv>`

[server/auth/session.ts](./server/auth/session.ts) では、関数が受け取るHonoのコンテキストを型付けしています。

### 型を受け取る側：Honoライブラリ

`Context` も、環境の型を受け取るジェネリックな型です。概念的には次の関係です。

```ts
type Context<TEnvironment> = {
  // TEnvironmentに応じてenvやgetなどを型付けする
};
```

### 型を提供する側：`cookie()` の宣言

```ts
export function cookie(c: Context<AppEnv>, name: string) {
  // ...
}
```

このリポジトリが `AppEnv` を提供することで、Hono側の `TEnvironment` に `AppEnv` が入ります。その結果、この関数内でも `c.env` や `c.get()` をアプリ固有の型で利用できます。

```text
提供する側: Context<AppEnv>
                    ↓
受け取る側: Context<TEnvironment>
                    ↓
引数cがAppEnv用のContextになる
```

```text
Hono<AppEnv>       ルーター全体を型付けする
Context<AppEnv>    関数へ渡すコンテキストを型付けする
```



## `setQueryData<MeResponse>`

[src/hooks/use-session.ts](./src/hooks/use-session.ts) では、React Queryのキャッシュに保存されるデータ型を指定しています。

### 型を受け取る側：React Query

実際の型定義には複数の型パラメーターやオーバーロードがありますが、今回の関係だけを単純化すると、次のように考えられます。

```ts
function setQueryData<TData>(
  queryKey: QueryKey,
  updater: (previous: TData | undefined) => TData | undefined,
): TData | undefined;
```

React Query側は、キャッシュデータの型を `TData` として受け取ります。

### 型を提供する側：`useSession()`

```ts
queryClient.setQueryData<MeResponse>(meQueryKey, (previous) =>
  previous ? { ...previous, user: null } : undefined,
);
```

このリポジトリが `MeResponse` を提供するため、React Query側の `TData` が `MeResponse` に置き換わります。

```text
提供する側: setQueryData<MeResponse>(...)
                             ↓
受け取る側: setQueryData<TData>(...)
                             ↓
previousはMeResponse | undefinedになる
```

そのため、コールバックの `previous` は次の型として扱われます。

```ts
MeResponse | undefined
```

存在しないプロパティへアクセスしたり、`MeResponse` と異なるデータを返したりすると、TypeScriptが型エラーを表示できます。

## Promise\<T>

`Promise` は、まだ完了していない非同期処理を表すオブジェクトです。Promiseには次の3つの状態があります。

| 状態 | 意味 |
| --- | --- |
| `pending` | 処理中 |
| `fulfilled` | 処理に成功し、値が決まった |
| `rejected` | 処理に失敗した |

`Promise<T>` の `T` は、非同期処理が成功したときに得られる値の型です。

```ts
Promise<string>      // 成功するとstringを得る
Promise<SessionUser> // 成功するとSessionUserを得る
Promise<void>        // 成功しても利用する値はない
```

### 型を受け取る側：`Promise<T>`

型を受け取る側である `Promise` は、成功時の値の型を `T` として受け取ります。

```ts
// Promise側の関係を単純化したイメージ
interface Promise<T> {
  then<TResult>(callback: (value: T) => TResult): Promise<TResult>;
}
```

`then()` のコールバックへ渡される `value` が `T` になるため、Promiseを利用する側まで成功時の型が伝わります。

### 型を提供する側：`Promise<SessionUser>`

利用側は、山括弧の中に成功時の値の型を提供します。

```ts
Promise<SessionUser>
Promise<void>
Promise<OAuthFlow | undefined>
```

例えば `Promise<SessionUser>` では、提供された `SessionUser` がPromise側の `T` に入ります。そのため、「将来 `SessionUser` を返す非同期処理」という意味になります。

```text
提供する側: Promise<SessionUser>
                       ↓
受け取る側: Promise<T>
                       ↓
完了時の値: SessionUser
```

### `async` 関数と `Promise<T>`

`async` を付けた関数は、必ずPromiseを返します。関数内で返す値の型を `T` とすると、関数全体の戻り値は `Promise<T>` になります。

```ts
async function getName(): Promise<string> {
  return "Maximum";
}
```

この関数内では `string` を返していますが、呼び出し側が直接受け取るのは `Promise<string>` です。

```text
関数内で返す値: string
                    ↓ asyncがPromiseで包む
関数の戻り値    : Promise<string>
```

このリポジトリでは、例えばセッションのユーザー検索が次の戻り値を持ちます。

```ts
async findUser(
  id: string,
  now: number,
): Promise<SessionUser | undefined> {
  // ...
}
```

これは、処理の完了後に `SessionUser` または `undefined` が得られることを表します。

### `await` はPromiseの中の値を取り出す

`await` を使うと、Promiseが完了するまで待ち、成功時の値を取り出せます。

```ts
const promise: Promise<string> = getName();
const name: string = await promise;
```

型の変化は次のようになります。

```text
await Promise<string>
          ↓
        string
```

`Promise<SessionUser | undefined>` を `await` した場合は、`SessionUser | undefined` が得られます。

### `api<T>` と `Promise<T>` の関係

このリポジトリの `api` は、受け取った型パラメーター `T` を `Promise<T>` へ渡しています。

```ts
async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  // ...
}
```

呼び出し側が `MeResponse` を `api` へ提供すると、その型がさらに `Promise` へ提供されます。

```text
api<MeResponse>(...)
       ↓ T = MeResponse
Promise<T>
       ↓
Promise<MeResponse>
       ↓ await
MeResponse
```

ジェネリクスが入れ子になっていても、内側から順に見る必要はありません。最初に `api` の `T` が何になるか確認し、その `T` を `Promise<T>` へ当てはめると理解しやすくなります。

### `Promise<void>`

処理の完了だけを待ち、成功時に利用する値がない場合は `Promise<void>` を使います。

```ts
async function logout(): Promise<void> {
  await api<void>("/auth/logout", { method: "POST" });
}
```

`void` は非同期処理を行わないという意味ではありません。「非同期処理は行うが、成功後に利用する戻り値はない」という意味です。

### 失敗時の型は `T` に含まれない

`Promise<T>` の `T` が表すのは成功時の値だけです。標準のPromiseには、失敗時の値を指定する2つ目の型パラメーターはありません。

```ts
const name = await getName(); // 成功時の値はstring
```

Promiseがrejectされた場合は例外になるため、必要に応じて `try...catch` で処理します。

```ts
try {
  const name = await getName();
} catch (error: unknown) {
  // errorを確認して処理する
}
```

`Promise<string>` と書いても、「必ず成功する」という意味にはなりません。成功した場合の値が `string` であることだけを表します。

## その他の組み込みのジェネリック型

TypeScriptには、`Promise` 以外にも日常的に使われるジェネリック型が用意されています。

### `ReturnType<T>`

`ReturnType` は、関数の型を受け取り、その関数の戻り値の型を作るジェネリックなユーティリティ型です。

受け取る側では、`T` を関数型として受け取ります。

```ts
// 関係を単純化したイメージ
type ReturnType<T extends (...args: any[]) => any> =
  T extends (...args: any[]) => infer TResult ? TResult : never;
```

このリポジトリでは、利用側が `typeof useSession` を提供しています。

```ts
export type SessionState = ReturnType<typeof useSession>;
```

```text
提供する側: ReturnType<typeof useSession>
                              ↓
受け取る側: ReturnType<T>
                              ↓
T = typeof useSession
                              ↓
結果: useSessionの戻り値の型
```

`typeof useSession` で関数自体の型を取得し、それを `ReturnType` の型引数へ渡しています。`useSession` の戻り値を変更すると、`SessionState` も自動的に追従します。

### `Omit<T, K>`

`Omit` は、オブジェクト型 `T` と取り除くキー `K` の2つを受け取るジェネリックなユーティリティ型です。

```ts
// Omit側が受け取るものを単純化したイメージ
type Omit<T, K extends PropertyKey> = Pick<T, Exclude<keyof T, K>>;
```

このリポジトリでは、利用側が `SessionUser` と `"id"` を提供しています。

```ts
export type Session = Omit<SessionUser, "id"> & {
  id: string;
  userId: string;
  expires: number;
};
```

```text
提供する側: Omit<SessionUser, "id">
                  ↓           ↓
受け取る側: Omit<T,           K>
                  ↓           ↓
              SessionUser   "id"
```

この例では、`SessionUser` から `id` を取り除いたあと、セッション用の `id`、`userId`、`expires` を追加しています。

`Omit` は2つの型引数を取ります。

```text
Omit<元の型, 取り除くキー>
```

## 型パラメーターの複数定義

ジェネリクスでは、山括弧の中に型パラメーターをカンマ区切りで複数定義できます。

```ts
function 関数名<TFirst, TSecond>() {
  // TFirstとTSecondを利用する処理
}
```

複数定義するのは、入力と出力など、異なる役割の型をそれぞれ維持したい場合です。

### 型を受け取る側

```ts
function pair<TFirst, TSecond>(first: TFirst, second: TSecond) {
  return { first, second };
}
```

この関数は、次の2つの型を別々に受け取ります。

- `TFirst`：第1引数 `first` の型
- `TSecond`：第2引数 `second` の型

### 型を提供する側

利用側も、同じ順番で2つの型引数を提供します。

```ts
const result = pair<string, number>("age", 20);
```

2つの型は、左から同じ位置にある型パラメーターへ渡されます。

```text
提供する側: pair<string, number>(...)
                    ↓       ↓
受け取る側: pair<TFirst, TSecond>(...)
                    ↓       ↓
firstの型       string   secondの型 number
```

この場合、戻り値は次の型になります。

```ts
{
  first: string;
  second: number;
}
```

型パラメーターが複数ある場合は、`T`、`U` のような短い名前だけでなく、`TData`、`TError`、`TEnvironment` のように役割が分かる名前も使われます。

### オブジェクト型で複数定義する例

関数だけでなく、`type` や `interface` でも複数の型パラメーターを定義できます。

```ts
// 型を受け取る側
type Result<TData, TError> =
  | { success: true; data: TData }
  | { success: false; error: TError };

// 型を提供する側
type UserResult = Result<SessionUser, string>;
```

提供された型は、同じ位置の型パラメーターへ対応します。

```text
提供する側: Result<SessionUser, string>
                    ↓           ↓
受け取る側: Result<TData,       TError>
                    ↓           ↓
dataの型        SessionUser   errorの型 string
```

`UserResult` は、次のどちらかの形になります。

```ts
{ success: true; data: SessionUser }

// または

{ success: false; error: string }
```

### 複数の型も推論できる

関数の引数から判断できる場合は、複数の型引数をすべて省略できます。

```ts
const result = pair("age", 20);
// TFirst  = string
// TSecond = number
```

この場合、利用者が型を明示していなくても、`"age"` と `20` からTypeScriptがそれぞれの型を提供します。

### 型引数は定義された順番で渡す

型引数は、型パラメーターが定義された順番に対応します。

```ts
pair<string, number>("age", 20);
```

`string` は `TFirst`、`number` は `TSecond` に入ります。順番を逆にすると、値の引数と型が一致しません。

```ts
pair<number, string>("age", 20);
//                  ^^^^^  ^^ 型が逆なのでエラー
```

複数の型パラメーターを定義するときは、呼び出し側が対応関係を判断できるように、役割が分かる名前と順番にすることが重要です。

## 型へ条件を付ける

`extends` を使うと、型引数として受け入れる型を制限できます。

```ts
// 型を受け取る側
function getId<T extends { id: string }>(value: T): string {
  return value.id;
}
```

定義側はどんな型でも受け取るわけではなく、`{ id: string }` を満たす型だけを受け取ります。

```ts
// 型を提供する側（値から型が推論される）
getId({ id: "user-1", name: "Alice" }); // 使用できる
getId({ name: "Alice" });               // 型エラー
```

1つ目の呼び出しでは、TypeScriptが値から `{ id: string; name: string }` という型を提供します。この型は制約を満たしています。2つ目の型には `id` がないため、受け取る側の条件を満たしません。

制約を付けることで、関数内では `T` の詳細が決まっていなくても、少なくとも `id` が存在すると保証できます。

## 読むときの手順

ジェネリクスを見つけたら、片方だけで意味を判断せず、次の順番で対応を探します。

1. `<T>` などを宣言している、型を受け取る側を探す。
2. 受け取った型が、引数、戻り値、プロパティのどこで使われるか確認する。
3. `<MeResponse>` などを渡している、型を提供する側を探す。
4. 型引数が省略されている場合は、どの値から型が推論されるか確認する。
5. 提供された具体的な型で、定義側の `T` を置き換える。

例えば、次のコードを見つけた場合を考えます。

```ts
const response = await api<MeResponse>("/api/me");
```

利用側だけでは `MeResponse` が何に使われるか分からないため、`api` の定義を確認します。

```ts
async function api<T>(path: string): Promise<T> {
  // ...
}
```

そこで初めて、提供した `MeResponse` が戻り値の `Promise<T>` に使われ、`await` 後の `response` の型になると分かります。

## 対応関係のまとめ

| 使用例 | 型を提供する側 | 型を受け取る側 | 型が反映される場所 |
| --- | --- | --- | --- |
| `api<MeResponse>()` | `MeResponse` | `api<T>()` | `Promise<T>` |
| `new Hono<AppEnv>()` | `AppEnv` | `Hono<TEnvironment>` | ルートのContext |
| `Context<AppEnv>` | `AppEnv` | `Context<TEnvironment>` | `c.env`、`c.get()`、`c.set()` |
| `setQueryData<MeResponse>()` | `MeResponse` | `setQueryData<TData>()` | キャッシュとupdaterの引数・戻り値 |
| `Promise<SessionUser>` | `SessionUser` | `Promise<T>` | 非同期処理の完了値 |
| `ReturnType<typeof useSession>` | `typeof useSession` | `ReturnType<T>` | 生成される戻り値型 |
| `Omit<SessionUser, "id">` | `SessionUser` と `"id"` | `Omit<T, K>` | プロパティを除いた新しい型 |

ジェネリクスは山括弧の片側だけで成立する仕組みではありません。「型を提供する側」と「型を受け取る側」、さらに「受け取った型が使われる場所」を一組として読むことが重要です。
