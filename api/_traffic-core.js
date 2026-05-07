const apiKey = process.env.GOOGLE_MAPS_API_KEY;

function requireApiKey() {
  if (!apiKey) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY on the hosted traffic service.");
  }
}

async function refreshTraffic(body) {
  requireApiKey();

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
  requireApiKey();

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

    return (data.places ?? [])
      .map((place) => ({
        placeId: place.id,
        name: place.displayName?.text ?? "Saved Location",
        address: place.formattedAddress ?? "",
        latitude: place.location?.latitude,
        longitude: place.location?.longitude,
      }))
      .filter((place) => typeof place.latitude === "number" && typeof place.longitude === "number");
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

  return (legacyData.results ?? [])
    .slice(0, 5)
    .map((place) => ({
      placeId: place.place_id,
      name: place.name ?? "Saved Location",
      address: place.formatted_address ?? "",
      latitude: place.geometry?.location?.lat,
      longitude: place.geometry?.location?.lng,
    }))
    .filter((place) => typeof place.latitude === "number" && typeof place.longitude === "number");
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

module.exports = {
  refreshTraffic,
  searchPlaces,
};
