// netlify/functions/admin-login.js
// Serverless function — läuft nur auf Netlify-Servern, nie im Browser.
// Das Passwort steht NUR in der Netlify-Umgebungsvariable ADMIN_PASSWORD.

exports.handler = async (event) => {
  // Nur POST erlauben
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, error: "Method not allowed" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false }),
    };
  }

  const entered = (body.password || "").trim();
  const correct = process.env.ADMIN_PASSWORD || "";

  // Sicherheitscheck: Passwort muss gesetzt sein
  if (!correct) {
    console.error("ADMIN_PASSWORD environment variable is not set.");
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false }),
    };
  }

  // Zeitkonstanter Vergleich (verhindert Timing-Angriffe)
  const isValid = entered.length === correct.length &&
    entered.split("").every((char, i) => char === correct[i]);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      // Kein Caching — jede Anfrage wird frisch geprüft
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({ ok: isValid }),
  };
};
