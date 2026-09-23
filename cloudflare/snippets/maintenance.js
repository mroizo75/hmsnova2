/**
 * HMS Nova – Cloudflare Snippet: oppdateringsside for VPS
 *
 * Skal stå PÅ hele tiden (rule: true). Vanlig trafikk går gjennom.
 * Når tjenesten stoppes ved deploy (502 fra nginx, eller Cloudflare
 * 521/522/523/524/530), vises merkevaresiden i stedet for standardfeil.
 * Når Node er oppe igjen, lastes siden automatisk.
 *
 * Oppsett:
 * 1. Rules → Snippets → Create Snippet → navn: maintenance
 * 2. Lim inn denne filen
 * 3. Rule expression: true
 * 4. Enable – og la den stå på
 */

const FORCE_MAINTENANCE = false;

const statusCode = 503;
const retryAfterSeconds = 120;
const estimatedTime = "ca. 2 minutter";
const contactEmail = "post@hmsnova.no";
const contactPhone = "+47 41 87 40 10";
const contactPhoneTel = "+4741874010";

const BYPASS_COOKIE = "hmsnova_maint";
const BYPASS_TOKEN = "BYTT_DENNE_TOKENEN";

const ORIGIN_DOWN_STATUSES = new Set([502, 504, 521, 522, 523, 524, 530]);

export default {
  async fetch(request) {
    const bypass = getBypassState(request);

    if (FORCE_MAINTENANCE && !bypass) {
      return maintenanceResponse(request);
    }

    const url = new URL(request.url);
    if (bypass === "set-cookie") url.searchParams.delete("bypass");

    const response = await fetch(
      bypass === "set-cookie" ? new Request(url, request) : request
    );

    if (bypass === "set-cookie") {
      const next = new Response(response.body, response);
      next.headers.append(
        "Set-Cookie",
        `${BYPASS_COOKIE}=${BYPASS_TOKEN}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=14400`
      );
      return next;
    }

    if (!bypass && ORIGIN_DOWN_STATUSES.has(response.status)) {
      return maintenanceResponse(request);
    }

    return response;
  },
};

function maintenanceResponse(request) {
  const url = new URL(request.url);
  const accept = request.headers.get("Accept") || "";
  const wantsJson =
    url.pathname.startsWith("/api/") || accept.includes("application/json");

  if (wantsJson) {
    return new Response(
      JSON.stringify({
        code: "MAINTENANCE",
        message: "HMS Nova oppdateres. Prøv igjen om et øyeblikk.",
        retryAfterSeconds,
      }),
      {
        status: statusCode,
        headers: maintenanceHeaders("application/json; charset=utf-8"),
      }
    );
  }

  return new Response(generateMaintenancePage(), {
    status: statusCode,
    headers: maintenanceHeaders("text/html; charset=utf-8"),
  });
}

function getBypassState(request) {
  if (BYPASS_TOKEN === "BYTT_DENNE_TOKENEN") return null;

  const url = new URL(request.url);
  if (url.searchParams.get("bypass") === BYPASS_TOKEN) return "set-cookie";
  if (request.headers.get("X-Maintenance-Bypass") === BYPASS_TOKEN) return "ok";

  const cookies = request.headers.get("Cookie") || "";
  const match = cookies.match(/(?:^|;\s*)hmsnova_maint=([^;]+)/);
  if (match && match[1] === BYPASS_TOKEN) return "ok";

  return null;
}

function maintenanceHeaders(contentType) {
  return {
    "Content-Type": contentType,
    "Retry-After": String(retryAfterSeconds),
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

function generateMaintenancePage() {
  return `<!DOCTYPE html>
<html lang="nb">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#0f2f28">
  <meta http-equiv="refresh" content="8">
  <title>HMS Nova oppdateres</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cpath fill='%2322c55e' d='M32 8a24 24 0 1 0 17 7'/%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --pine: #0f2f28;
      --forest: #164a3d;
      --leaf: #22c55e;
      --teal: #2d9c92;
      --cream: #f4efe4;
      --paper: #fffdf8;
      --ink: #14221e;
      --muted: #5a6b64;
      --line: rgba(22, 74, 61, 0.14);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body { min-height: 100%; }

    body {
      font-family: "Schibsted Grotesk", "Segoe UI", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(1200px 600px at 12% -10%, rgba(45, 156, 146, 0.18), transparent 55%),
        radial-gradient(900px 500px at 110% 10%, rgba(34, 197, 94, 0.12), transparent 50%),
        linear-gradient(180deg, #e9efe8 0%, var(--cream) 42%, #efe8d8 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.35;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.45'/%3E%3C/svg%3E");
    }

    .shell {
      position: relative;
      width: min(560px, 100%);
      animation: rise 0.7s ease both;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 28px;
      animation: rise 0.7s ease both;
    }

    .mark {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
    }

    .wordmark {
      font-weight: 700;
      font-size: 1.2rem;
      letter-spacing: -0.04em;
      color: var(--pine);
    }

    .wordmark span { color: var(--leaf); }

    .card {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 28px;
      padding: 40px 36px 32px;
      box-shadow:
        0 1px 0 rgba(255, 255, 255, 0.8) inset,
        0 24px 60px -28px rgba(15, 47, 40, 0.35);
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--forest);
      background: rgba(45, 156, 146, 0.1);
      border: 1px solid rgba(45, 156, 146, 0.18);
      border-radius: 999px;
      padding: 6px 12px 6px 10px;
      margin-bottom: 22px;
      animation: rise 0.7s ease 0.08s both;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--teal);
      box-shadow: 0 0 0 0 rgba(45, 156, 146, 0.55);
      animation: pulse 2.2s ease-out infinite;
    }

    h1 {
      font-family: Newsreader, "Iowan Old Style", Georgia, serif;
      font-size: clamp(2rem, 6vw, 2.7rem);
      font-weight: 600;
      letter-spacing: -0.03em;
      line-height: 1.12;
      color: var(--pine);
      margin-bottom: 14px;
      animation: rise 0.7s ease 0.14s both;
    }

    .lead {
      font-size: 1.05rem;
      line-height: 1.6;
      color: var(--muted);
      margin-bottom: 28px;
      animation: rise 0.7s ease 0.2s both;
    }

    .eta {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 18px;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(15, 47, 40, 0.04), rgba(45, 156, 146, 0.08));
      border: 1px solid var(--line);
      margin-bottom: 28px;
      animation: rise 0.7s ease 0.26s both;
    }

    .eta-label {
      font-size: 0.82rem;
      color: var(--muted);
      font-weight: 500;
    }

    .eta-value {
      font-family: Newsreader, Georgia, serif;
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--forest);
    }

    .contact {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      animation: rise 0.7s ease 0.32s both;
    }

    .contact a {
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-decoration: none;
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.7);
      transition: border-color 0.2s, transform 0.2s;
    }

    .contact a:hover {
      border-color: var(--teal);
      transform: translateY(-1px);
    }

    .contact small {
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 600;
    }

    .contact span {
      font-size: 0.92rem;
      font-weight: 600;
      color: var(--forest);
    }

    footer {
      margin-top: 22px;
      text-align: center;
      font-size: 0.8rem;
      color: var(--muted);
      animation: rise 0.7s ease 0.38s both;
    }

    @keyframes rise {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: none; }
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(45, 156, 146, 0.5); }
      70% { box-shadow: 0 0 0 10px rgba(45, 156, 146, 0); }
      100% { box-shadow: 0 0 0 0 rgba(45, 156, 146, 0); }
    }

    @media (max-width: 520px) {
      .card { padding: 28px 22px 24px; border-radius: 22px; }
      .contact { grid-template-columns: 1fr; }
      .eta { flex-direction: column; align-items: flex-start; gap: 4px; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before { animation: none !important; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <div class="brand">
      <svg class="mark" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M46.8 16.4A20.5 20.5 0 1 0 53 33" fill="none" stroke="#22c55e" stroke-width="4.8" stroke-linecap="round"/>
        <path d="M41 11.6l9.6 2.2-2.8 9" fill="none" stroke="#22c55e" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round"/>
        <ellipse cx="26.5" cy="29" rx="6.2" ry="11.5" transform="rotate(-38 26.5 29)" fill="#22c55e"/>
        <ellipse cx="38.5" cy="27" rx="6.2" ry="12.2" transform="rotate(34 38.5 27)" fill="#22c55e"/>
        <path d="M32 34v13" stroke="#22c55e" stroke-width="2.6" stroke-linecap="round"/>
        <ellipse cx="32" cy="48.2" rx="10" ry="3.4" fill="#22c55e"/>
      </svg>
      <div class="wordmark"><span>HMS</span> Nova</div>
    </div>

    <article class="card">
      <div class="status"><span class="dot"></span> Oppdatering pågår</div>
      <h1>Vi ruller ut en ny versjon</h1>
      <p class="lead">HMS Nova oppdateres akkurat nå. Dette er planlagt, og dataene dine er trygge. Siden kommer tilbake av seg selv når tjenesten er oppe igjen.</p>
      <div class="eta">
        <span class="eta-label">Vanligvis tilbake om</span>
        <span class="eta-value">${estimatedTime}</span>
      </div>
      <div class="contact">
        <a href="mailto:${contactEmail}">
          <small>E-post</small>
          <span>${contactEmail}</span>
        </a>
        <a href="tel:${contactPhoneTel}">
          <small>Telefon</small>
          <span>${contactPhone}</span>
        </a>
      </div>
    </article>

    <footer>HMS Nova AS · Siden lastes på nytt automatisk</footer>
  </main>
  <script>
    (function poll() {
      fetch(location.href, { method: "HEAD", cache: "no-store", redirect: "manual" })
        .then(function (res) {
          if (res.status && res.status < 500) location.reload();
        })
        .catch(function () {});
      setTimeout(poll, 4000);
    })();
  </script>
</body>
</html>`;
}
