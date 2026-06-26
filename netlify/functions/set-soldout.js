// netlify/functions/set-soldout.js
// Setzt den Ausverkauft-Status für Artikel.
// Geschützt durch Token-Verifikation — nur Admins dürfen schreiben.

const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

function sign(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function verifyToken(token, secret) {
  try {
    const parts = token.split(".");
    const signature = parts[parts.length - 1];
    const encodedPayload = parts.slice(0, -1).join(".");
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const expectedSig = sign(payload, secret);
    const sigValid = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex")
    );
    if (!sigValid) return false;
    const expires = parseInt(payload.split(".")[0], 10);
    return Date.now() <= expires;
  } catch {
    return false;
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ ok: false }) };
  }

  // Token prüfen
  const secret = process.env.TOKEN_SECRET || "";
  if (!secret || !verifyToken(body.token || "", secret)) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: false, error: "Unauthorized" }),
    };
  }

  // soldOut ist ein Array von Artikelnamen die ausverkauft sind
  const soldOut = Array.isArray(body.soldOut) ? body.soldOut : [];

  try {
    const store = getStore({ name: "vareethip", consistency: "strong" });
    await store.setJSON("soldout", { soldOut, updatedAt: Date.now() });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error("Blob write error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Storage error" }),
    };
  }
};
