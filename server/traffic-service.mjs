import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const env = loadEnv();
const apiKey = env.GOOGLE_MAPS_API_KEY;
const port = Number(env.TRAFFIC_SERVICE_PORT ?? 8787);

if (!apiKey) {
  console.error("Missing GOOGLE_MAPS_API_KEY. Add it to .env or your local *.env file.");
  process.exit(1);
}

const server = createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { ok: true, service: "roaderunner-traffic-service" });
    return;
  }

  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && requestUrl.pathname === "/places/search") {
    try {
      const query = requestUrl.searchParams.get("query") ?? "";
      const results = await searchPlaces(query);
      sendJson(response, 200, { results });
    } catch (error) {
      sendJson(response, 500, {
        error: "PLACES_SERVICE_ERROR",
        message: error instanceof Error ? error.message : "Place search failed.",
      });
    }
    return;
  }

  if (request.method === "POST" && request.url === "/traffic/refresh") {
    try {
      const body = await readJsonBody(request);
      const results = await refreshTraffic(body);
      sendJson(response, 200, { results });
    } catch (error) {
      sendJson(response, 500, {
        error: "TRAFFIC_SERVICE_ERROR",
        message: error instanceof Error ? error.message : "Traffic refresh failed.",
      });
    }
    return;
  }

  sendJson(response, 404, { error: "NOT_FOUND" });
});

server.listen(port, () => {
  console.log(`RoadeRunner Traffic_Service listening on http://localhost:${port}`);
});

async function refreshTraffic(body) {
  const origin = body?.Driver_Location;
  const destinations = Array.isArray(body?.destinations) ? body.destinations : [];

  if (!origin?.latitude || !origin?.longitude) {
    throw new Error("Driver_Location is required.");
  }

  if (destinations.length === 0) {
    return [];
  }

  return Promise.all(destinations.map((destination) => computeRoute(origin, destination)));
}

async function searchPlaces(query) {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 3) {
    return [];
  }

  const newPlacesResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({
      textQuery: trimmedQuery,
      maxResultCount: 5,
    }),
  });

  if (newPlacesResponse.ok) {
    const data = await newPlacesResponse.json();

    return (data.places ?? []).map((place) => ({
      placeId: place.id,
      name: place.displayName?.text ?? "Saved Location",
      address: place.formattedAddress ?? "",
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
    })).filter((place) => typeof place.latitude === "number" && typeof place.longitude === "number");
  }

  const legacyUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  legacyUrl.searchParams.set("query", trimmedQuery);
  legacyUrl.searchParams.set("key", apiKey);

  const legacyResponse = await fetch(legacyUrl);

  if (!legacyResponse.ok) {
    const errorText = await legacyResponse.text();
    throw new Error(`Google Places error ${legacyResponse.status}: ${errorText.slice(0, 500)}`);
  }

  const legacyData = await legacyResponse.json();

  if (legacyData.status && legacyData.status !== "OK" && legacyData.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places status ${legacyData.status}: ${legacyData.error_message ?? "No details"}`);
  }

  return (legacyData.results ?? []).slice(0, 5).map((place) => ({
    placeId: place.place_id,
    name: place.name ?? "Saved Location",
    address: place.formatted_address ?? "",
    latitude: place.geometry?.location?.lat,
    longitude: place.geometry?.location?.lng,
  })).filter((place) => typeof place.latitude === "number" && typeof place.longitude === "number");
}

async function computeRoute(origin, destination) {
  if (!destination.latitude || !destination.longitude) {
    return {
      destinationId: destination.id,
      hasSpeedReadingIntervals: false,
      warning: "Saved location is missing latitude/longitude.",
    };
  }

  const [trafficRoute, baselineRoute] = await Promise.all([
    fetchRoute(origin, destination, "TRAFFIC_AWARE_OPTIMAL"),
    fetchRoute(origin, destination, "TRAFFIC_UNAWARE"),
  ]);

  if (trafficRoute.error) {
    return {
      destinationId: destination.id,
      hasSpeedReadingIntervals: false,
      warning: trafficRoute.error,
    };
  }

  if (!trafficRoute.route) {
    return {
      destinationId: destination.id,
      hasSpeedReadingIntervals: false,
      warning: "No route returned.",
    };
  }

  const route = trafficRoute.route;
  const durationSeconds = parseGoogleDuration(route.duration);
  const staticDurationSeconds = parseGoogleDuration(route.staticDuration);
  const baselineDurationSeconds = parseGoogleDuration(baselineRoute.route?.duration) || staticDurationSeconds;
  const normalSeconds = baselineDurationSeconds || staticDurationSeconds;
  const delayMinutes = Math.max(0, Math.round((durationSeconds - normalSeconds) / 60));
  const intervals = route.travelAdvisory?.speedReadingIntervals;

  return {
    destinationId: destination.id,
    etaMinutes: Math.round(durationSeconds / 60),
    normalMinutes: Math.round(normalSeconds / 60),
    delayMinutes,
    alternateRouteExists: (trafficRoute.routeCount ?? 0) > 1,
    hasSpeedReadingIntervals: Array.isArray(intervals) && intervals.length > 0,
    congestionSegments: mapSpeedIntervals(intervals ?? []),
    calculation: {
      trafficSeconds: durationSeconds,
      staticSeconds: staticDurationSeconds,
      baselineSeconds: baselineDurationSeconds,
    },
  };
}

async function fetchRoute(origin, destination, routingPreference) {
  const wantsTraffic = routingPreference !== "TRAFFIC_UNAWARE";
  const googleResponse = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "routes.duration,routes.staticDuration,routes.distanceMeters,routes.travelAdvisory.speedReadingIntervals,routes.routeLabels",
    },
    body: JSON.stringify({
      origin: {
        location: {
          latLng: {
            latitude: origin.latitude,
            longitude: origin.longitude,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        },
      },
      travelMode: "DRIVE",
      routingPreference,
      computeAlternativeRoutes: wantsTraffic,
      ...(wantsTraffic ? { extraComputations: ["TRAFFIC_ON_POLYLINE"] } : {}),
    }),
  });

  if (!googleResponse.ok) {
    return {
      error: `Google Routes error ${googleResponse.status}`,
    };
  }

  const data = await googleResponse.json();
  return {
    route: data.routes?.[0],
    routeCount: data.routes?.length ?? 0,
  };
}

function mapSpeedIntervals(intervals) {
  return intervals
    .filter((interval) => interval.speed === "SLOW" || interval.speed === "TRAFFIC_JAM")
    .map((interval) => ({
      label: interval.speed === "TRAFFIC_JAM" ? "JAM" : "SLOW",
      startOffsetMeters: interval.startPolylinePointIndex ?? 0,
      endOffsetMeters: interval.endPolylinePointIndex ?? 0,
    }));
}

function parseGoogleDuration(duration) {
  if (typeof duration !== "string") {
    return 0;
  }

  return Number(duration.replace("s", "")) || 0;
}

function readJsonBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let rawBody = "";

    request.on("data", (chunk) => {
      rawBody += chunk;
    });

    request.on("end", () => {
      try {
        resolveBody(rawBody ? JSON.parse(rawBody) : {});
      } catch (error) {
        rejectBody(error);
      }
    });

    request.on("error", rejectBody);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function loadEnv() {
  const envFiles = [".env", "TempAPI.env"];
  const loaded = { ...process.env };

  for (const envFile of envFiles) {
    const envPath = resolve(envFile);

    if (!existsSync(envPath)) {
      continue;
    }

    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const value = trimmedLine.slice(separatorIndex + 1).trim();
      loaded[key] = value.replace(/^["']|["']$/g, "");
    }
  }

  return loaded;
}
