const { searchPlaces } = require("../_traffic-core");
const { handleOptions, sendJson } = require("../_response");

module.exports = async function handler(request, response) {
  if (handleOptions(request, response)) {
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "METHOD_NOT_ALLOWED" });
    return;
  }

  try {
    const query = typeof request.query?.query === "string" ? request.query.query : "";
    const results = await searchPlaces(query);
    sendJson(response, 200, { results });
  } catch (error) {
    sendJson(response, 500, {
      error: "PLACES_SERVICE_ERROR",
      message: error instanceof Error ? error.message : "Place search failed.",
    });
  }
};
