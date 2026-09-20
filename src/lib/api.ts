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
