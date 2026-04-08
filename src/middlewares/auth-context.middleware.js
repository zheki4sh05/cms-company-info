const crypto = require("crypto");

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
  const raw = process.env.JWT_PUBLIC_KEY;
  if (!raw) return null;
  // Supports .env style "-----BEGIN...\\n...\\n-----END..."
  return raw.replace(/\\n/g, "\n");
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
  return (
    payload.userId ??
    payload.user_id ??
    payload.sub ??
    payload.id ??
    null
  );
}

function authContextMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const employeeId =
    req.headers.employeeid ??
    req.headers.employeid ??
    req.headers["x-employee-id"] ??
    null;

  let userId = null;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    const publicKey = resolvePublicKey();
    if (publicKey) {
      const { valid, payload } = verifyJwtRs256(token, publicKey);
      if (valid) {
        userId = pickUserId(payload);
      }
    }
  }

  req.authContext = {
    userId: userId != null ? String(userId) : null,
    employeeId: employeeId != null ? String(employeeId) : null,
  };

  next();
}

module.exports = { authContextMiddleware };
