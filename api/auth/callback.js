module.exports = function handler(request, response) {
  const host = request.headers.host ?? "rrunner-nine.vercel.app";
  const callbackUrl = new URL(request.url, `https://${host}`);
  const returnTo = callbackUrl.searchParams.get("return_to");

  if (!returnTo) {
    response.status(400).send(renderPage("RoadeRunner sign-in needs an app return URL.", null));
    return;
  }

  const appUrl = new URL(returnTo);

  callbackUrl.searchParams.forEach((value, key) => {
    if (key !== "return_to") {
      appUrl.searchParams.set(key, value);
    }
  });

  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.status(200).send(renderPage("Returning to RoadeRunner...", appUrl.toString()));
};

function renderPage(message, appUrl) {
  const escapedMessage = escapeHtml(message);
  const escapedUrl = appUrl ? escapeHtml(appUrl) : "";
  const scriptUrl = JSON.stringify(appUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>RoadeRunner Sign-In</title>
    <style>
      body {
        align-items: center;
        background: #ffffff;
        color: #24282b;
        display: flex;
        font-family: Arial, sans-serif;
        justify-content: center;
        margin: 0;
        min-height: 100vh;
        padding: 24px;
        text-align: center;
      }
      main { max-width: 420px; }
      h1 { font-size: 28px; line-height: 1.15; margin: 0 0 18px; }
      a {
        background: #0b9db9;
        border-radius: 8px;
        color: #ffffff;
        display: inline-block;
        font-size: 18px;
        font-weight: 800;
        margin-top: 12px;
        padding: 14px 18px;
        text-decoration: none;
      }
      p { color: #5f6670; font-size: 14px; line-height: 1.4; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapedMessage}</h1>
      ${appUrl ? `<p>If RoadeRunner does not reopen automatically, tap below.</p><a id="open-app" href="${escapedUrl}">Open RoadeRunner</a>` : ""}
    </main>
    ${appUrl ? `<script>
      (function () {
        var appUrl = new URL(${scriptUrl});
        var currentUrl = new URL(window.location.href);
        var hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        currentUrl.searchParams.forEach(function (value, key) {
          if (key !== "return_to") {
            appUrl.searchParams.set(key, value);
          }
        });

        hashParams.forEach(function (value, key) {
          if (key !== "return_to") {
            appUrl.searchParams.set(key, value);
          }
        });

        var finalUrl = appUrl.toString();
        var openLink = document.getElementById("open-app");
        if (openLink) {
          openLink.href = finalUrl;
        }

        window.location.href = finalUrl;
      })();
    </script>` : ""}
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
