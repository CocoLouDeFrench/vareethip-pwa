// netlify/functions/get-soldout.js
// Gibt die aktuelle Ausverkauft-Liste zurück.
// Öffentlich lesbar — kein Token nötig, da keine sensiblen Daten.

const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ ok: false }) };
  }

  try {
    const store = getStore({ name: "vareethip", consistency: "strong" });
    const data = await store.get("soldout", { type: "json" });

    const soldOut = data?.soldOut || [];

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        // Kurzes Caching (10 Sek.) — frisch genug für Kunden
        "Cache-Control": "public, max-age=10",
      },
      body: JSON.stringify({ ok: true, soldOut }),
    };
  } catch (err) {
    // Wenn noch kein Blob existiert, leere Liste zurückgeben
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=10" },
      body: JSON.stringify({ ok: true, soldOut: [] }),
    };
  }
};
