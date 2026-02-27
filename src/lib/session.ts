export type SessionPayload = {
  sub: string;
  name: string;
  role: string;
  email: string;
  iat: number;
  exp: number;
};

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret =
    process.env.SESSION_SECRET ??
    process.env.JWT_SECRET ??
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("Session secret is not set (SESSION_SECRET/JWT_SECRET/NEXTAUTH_SECRET)");
  }

  return secret;
}

function toUint8Array(value: string) {
  return new TextEncoder().encode(value);
}

function base64Encode(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64Decode(value: string) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toBase64Url(bytes: Uint8Array) {
  return base64Encode(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return base64Decode(padded);
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    toUint8Array(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, toUint8Array(value));
  return toBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function createSessionToken(
  data: Omit<SessionPayload, "iat" | "exp">,
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS
) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    ...data,
    iat: issuedAt,
    exp: issuedAt + maxAgeSeconds,
  };

  const encodedPayload = toBase64Url(toUint8Array(JSON.stringify(payload)));
  const signature = await sign(encodedPayload, getSessionSecret());
  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(token: string) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  try {
    const expectedSignature = await sign(encodedPayload, getSessionSecret());
    if (!timingSafeEqual(signature, expectedSignature)) return null;

    const payloadJson = new TextDecoder().decode(fromBase64Url(encodedPayload));
    const payload = JSON.parse(payloadJson) as SessionPayload;

    if (
      !payload ||
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
