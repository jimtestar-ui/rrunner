function setCors(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

function sendJson(response, statusCode, payload) {
  setCors(response);
  response.status(statusCode).json(payload);
}

function handleOptions(request, response) {
  if (request.method !== "OPTIONS") {
    return false;
  }

  setCors(response);
  response.status(204).end();
  return true;
}

module.exports = {
  handleOptions,
  sendJson,
};
