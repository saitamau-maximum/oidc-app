export type OAuthFlow = {
  id: string;
  state: string;
  nonce: string;
  verifier: string;
  expires: number;
};
