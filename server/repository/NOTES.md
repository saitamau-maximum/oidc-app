## インターフェースとは

TypeScriptのインターフェースは、簡単に言うと**このような形や機能を持っているというルールを定義するもの**です。

例えば、次のインターフェースを考えます。

```ts
interface UserRepository {
  findUser: (id: string) => Promise<User | undefined>;
  deleteUser: (id: string) => Promise<void>;
}
```

このコードでは、実際にユーザーを検索したり削除したりする処理はまだ書かれていません。

定義しているのは、**`findUser`というメソッドがある**
**`deleteUser`というメソッドがある**という**操作のルールだけ**です。

一方、**実際にどのように処理するか**は別のクラスなどで実装します。


## インターフェースと実装

`implements UserRepository` と書くことで、
`DatabaseUserRepository`は`UserRepository`で決められたルールに従いますという意味になります。

そのため、例えば `deleteUser` を書き忘れると、TypeScriptがエラーを出します。
```ts
class DatabaseUserRepository implements UserRepository {
  async findUser(id: string) {
    // ...
  }

  // deleteUser がない
}
```

この場合、`UserRepository`に必要な`deleteUser`が実装されていないとTypeScriptが検出してくれます。



## Repositoriesについて

[index.ts](./index.ts)で定義されている`Repositories`は`IOAuthRepository`と`ISessionRepository`を一つにまとめて使いやすくしています。

```ts
import type { IOAuthRepository } from "./oauth.ts";
import type { ISessionRepository } from "./session.ts";

export type Repositories = {
  oauth: IOAuthRepository;
  sessions: ISessionRepository;
};
```

## `IOAuthRepository`の実装元

[oauth.ts](./oauth.ts) では、OIDC認証フローを保存・取得・削除するためのルールを `IOAuthRepository` として定義しています。

```ts
export interface IOAuthRepository {
  deleteExpired: (now: number) => Promise<void>;
  deleteFlow: (id: string) => Promise<void>;
  createFlow: (flow: OAuthFlow) => Promise<void>;
  consumeFlow: (id: string) => Promise<OAuthFlow | undefined>;
}
```

このインターフェースを実装しているのは、[CloudflareOAuthRepository](../infrastructure/repository/oauth.ts) クラスです。

```ts
export class CloudflareOAuthRepository implements IOAuthRepository {
  // Cloudflare D1を使った処理
}
```



## `ISessionRepository` の実装元

[session.ts](./session.ts) では、ログインセッションを検索・保存・削除するためのルールを `ISessionRepository` として定義しています。

```ts
export interface ISessionRepository {
  findUser: (id: string, now: number) => Promise<SessionUser | undefined>;
  replace: (session: Session, previousId?: string) => Promise<void>;
  delete: (id: string) => Promise<void>;
}
```

このインターフェースを実装しているのは、[CloudflareSessionRepository](../infrastructure/repository/session.ts) クラスです。

```ts
export class CloudflareSessionRepository implements ISessionRepository {
  // Cloudflare D1を使った処理
}
```

