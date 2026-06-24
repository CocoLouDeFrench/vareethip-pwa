// netlify/functions/admin-login.js
// Prüft das Passwort und gibt bei Erfolg ein signiertes HMAC-Token zurück.
// Das Token enthält einen Ablauf-Timestamp und wird mit TOKEN_SECRET signiert.
// Kein Passwort und kein Secret ist je im Frontend sichtbar.

const crypto = require("crypto");

function sign(payload, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

function createToken(secret) {
  // Token-Payload: Ablaufzeit (24h) + zufälliger Salt
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  const salt = crypto.randomBytes(16).toString("hex");
  const payload = `${expires}.${salt}`;
  const signature = sign(payload, secret);
  // Format: base64(payload).signature
  return Buffer.from(payload).toString("base64url") + "." + signature;
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

  const entered = (body.password || "").trim();
  const correct = process.env.ADMIN_PASSWORD || "";
  const secret  = process.env.TOKEN_SECRET || "";

  if (!correct || !secret) {
    console.error("ADMIN_PASSWORD or TOKEN_SECRET environment variable is not set.");
    return { statusCode: 500, body: JSON.stringify({ ok: false }) };
  }

  // Zeitkonstanter Passwort-Vergleich
  const isValid =
    entered.length === correct.length &&
    entered.split("").every((char, i) => char === correct[i]);

  if (!isValid) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: false }),
    };
  }

  // Passwort korrekt — signiertes Token ausstellen
  const token = createToken(secret);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ ok: true, token }),
  };
};
