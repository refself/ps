export const JSON_HEADERS = {
  "Content-Type": "application/json"
};

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Max-Age": "86400"
};

export const JSON_CORS_HEADERS = {
  ...CORS_HEADERS,
  ...JSON_HEADERS
};

export const DEFAULT_STATUS = "idle";
export const MAX_VERSION_HISTORY = 50;

export const DEFAULT_USER_ID = "aceca593-9511-4621-a567-449207737244";
