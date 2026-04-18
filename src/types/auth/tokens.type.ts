export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds for access token
};

export type DeviceInfo = {
  ip?: string;
  userAgent?: string;
  deviceName?: string;
};
