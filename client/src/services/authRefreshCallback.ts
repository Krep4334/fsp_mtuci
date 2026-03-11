/**
 * Callback для обновления токенов в AuthContext после успешного refresh.
 * Используется в axios response interceptor, т.к. api.ts не имеет доступа к React-контексту.
 */
let onTokensRefreshed: ((accessToken: string, refreshToken: string) => void) | null = null;

export function setAuthRefreshCallback(cb: ((accessToken: string, refreshToken: string) => void) | null) {
  onTokensRefreshed = cb;
}

export function notifyTokensRefreshed(accessToken: string, refreshToken: string) {
  onTokensRefreshed?.(accessToken, refreshToken);
}
