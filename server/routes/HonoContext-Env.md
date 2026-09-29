# コンテキストに対する型注記

このページではこの1行について解説したいと思います。
```ts
const router = new Hono<AppEnv>();
```

[env.ts](../env.ts)のある`AppEnv`の定義も含めると実際はこのようになります。

```ts
export type Bindings = {
  DB: D1Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
  APP_ORIGIN: string;
  OIDC_CLIENT_ID?: string;
  OIDC_CLIENT_SECRET?: string;
  OIDC_ISSUER: string;
  OIDC_AUTHORIZATION_URL: string;
  OIDC_TOKEN_URL: string;
  OIDC_JWKS_URL: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: { 
    repositories: Repositories; 
    config: Config 
  };
};

const router = new Hono<AppEnv>();
```


## AppEnvとは何か

`<AppEnv>` はTypeScriptのジェネリクスです。



