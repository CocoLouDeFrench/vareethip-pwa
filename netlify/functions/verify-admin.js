// netlify/functions/verify-admin.js
// Prüft ob ein Token gültig und nicht abgelaufen ist.
// Das Token wird mit HMAC-SHA256 verifiziert — kein Datenbankzugriff nötig.

const crypto = require("crypto");

function sign(payload, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

function verifyToken(token, secret) {
  try {
    const parts = token.split(".");
    // Format: base64url(payload).signature
    // Aber payload selbst enthält keinen Punkt, signature ist hex (keine Punkte)
    // Letzter Teil = signature, alles davor = encoded payload
    const signature = parts[parts.length - 1];
    const encodedPayload = parts.slice(0, -1).join(".");
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");

    // Signatur prüfen
    const expectedSig = sign(payload, secret);
    const sigValid = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex")
    );
    if (!sigValid) return false;

    // Ablaufzeit prüfen
    const expires = parseInt(payload.split(".")[0], 10);
    if (Date.now() > expires) return false;

    return true;
  } catch {
    return false;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ ok: false }) };
  }

  const token  = (body.token || "").trim();
  const secret = process.env.TOKEN_SECRET || "";

  if (!secret) {
    console.error("TOKEN_SECRET environment variable is not set.");
    return { statusCode: 500, body: JSON.stringify({ ok: false }) };
  }

  if (!token) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: false }),
    };
  }

  const valid = verifyToken(token, secret);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ ok: valid }),
  };
};
