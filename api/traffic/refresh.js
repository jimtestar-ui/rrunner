const { refreshTraffic } = require("../_traffic-core");
const { handleOptions, sendJson } = require("../_response");

module.exports = async function handler(request, response) {
  if (handleOptions(request, response)) {
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "METHOD_NOT_ALLOWED" });
    return;
  }

  try {
    const results = await refreshTraffic(request.body ?? {});
    sendJson(response, 200, { results });
  } catch (error) {
    sendJson(response, 500, {
      error: "TRAFFIC_SERVICE_ERROR",
      message: error instanceof Error ? error.message : "Traffic refresh failed.",
    });
  }
};
