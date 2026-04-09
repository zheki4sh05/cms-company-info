const crypto = require("crypto");
const fs = require("fs");

function toBase64(base64url) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  return base64 + "=".repeat((4 - (base64.length % 4)) % 4);
}

function decodeJwtSegment(segment) {
  try {
    return JSON.parse(Buffer.from(toBase64(segment), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function resolvePublicKey() {
  function normalizePem(raw) {
    const value = raw.replace(/\\n/g, "\n").trim();
    if (!value) return null;
    if (value.includes("\n")) return value;

    const compactMatch = value.match(
      /^-----BEGIN PUBLIC KEY-----([A-Za-z0-9+/=]+)-----END PUBLIC KEY-----$/
    );
    if (!compactMatch) return value;

    const body = compactMatch[1];
    const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
    return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
  }

  const keyPath = process.env.JWT_PUBLIC_KEY_PATH;
  if (typeof keyPath === "string" && keyPath.trim()) {
    try {
      return normalizePem(fs.readFileSync(keyPath.trim(), "utf8"));
    } catch {
      return null;
    }
  }

  const raw = process.env.JWT_PUBLIC_KEY;
  if (typeof raw !== "string" || !raw.trim()) return null;
  // Supports:
  // 1) .env one-line with \n escapes
  // 2) compact one-line PEM without line breaks
  // 3) already multiline PEM
  return normalizePem(raw);
}

/**
 * RS256 verification equivalent to:
 * 1) hash_A = SHA256(header.payload)
 * 2) hash_B = RSA_DECRYPT(signature, PUBLIC_KEY)
 * 3) compare hash_A === hash_B
 */
function verifyJwtRs256(token, publicKey) {
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false, payload: null };

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = decodeJwtSegment(headerB64);
  const payload = decodeJwtSegment(payloadB64);
  if (!header || !payload) return { valid: false, payload: null };
  if (header.alg !== "RS256") return { valid: false, payload: null };

  try {
    const dataToVerify = `${headerB64}.${payloadB64}`;
    const signature = Buffer.from(toBase64(signatureB64), "base64");

    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(dataToVerify);
    verifier.end();

    const valid = verifier.verify(publicKey, signature);
    return { valid, payload: valid ? payload : null };
  } catch {
    return { valid: false, payload: null };
  }
}

function pickUserId(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (typeof payload.userId === "string" && payload.userId.trim()) {
    return payload.userId.trim();
  }
  return null;
}

function isTokenTimeValid(payload) {
  const now = Math.floor(Date.now() / 1000);

  if (payload && typeof payload.nbf === "number" && now < payload.nbf) {
    return false;
  }
  if (payload && typeof payload.exp === "number" && now >= payload.exp) {
    return false;
  }
  return true;
}

function authContextMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const employeeId =
    req.headers.employeeid ??
    req.headers.employeid ??
    req.headers["x-employee-id"] ??
    null;
  const forwardedUserId =
    req.headers["x-user-id"] ??
    req.headers["x-userid"] ??
    req.headers.userid ??
    null;

  let userId = null;
  if (typeof authHeader === "string") {
    const normalizedAuth = authHeader.trim().replace(/^"+|"+$/g, "");
    let token = null;

    const bearerMatch = normalizedAuth.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch?.[1]) {
      token = bearerMatch[1].trim().replace(/^"+|"+$/g, "");
    } else if (/^Bearer%20/i.test(normalizedAuth)) {
      token = decodeURIComponent(normalizedAuth).slice("Bearer ".length).trim();
    }

    const publicKey = resolvePublicKey();
    if (token && publicKey) {
      const { valid, payload } = verifyJwtRs256(token, publicKey);
      if (valid && isTokenTimeValid(payload)) {
        userId = pickUserId(payload);
      }
    }
  }

  // Fallback for trusted internal calls where auth-service forwards resolved userId.
  if (!userId && typeof forwardedUserId === "string" && forwardedUserId.trim()) {
    userId = forwardedUserId.trim();
  }

  req.authContext = {
    userId: userId != null ? String(userId) : null,
    employeeId: employeeId != null ? String(employeeId) : null,
  };

  next();
}

module.exports = { authContextMiddleware };
