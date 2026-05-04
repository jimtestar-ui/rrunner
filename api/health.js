const { handleOptions, sendJson } = require("./_response");

module.exports = function handler(request, response) {
  if (handleOptions(request, response)) {
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "METHOD_NOT_ALLOWED" });
    return;
  }

  sendJson(response, 200, { ok: true, service: "roaderunner-traffic-service" });
};
