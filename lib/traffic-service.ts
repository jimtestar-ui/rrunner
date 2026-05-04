import * as Location from "expo-location";
import {
  AppState,
  Destination,
  Driver_Location,
  TrafficColor,
  Traffic_Service_Result,
  Traffic_Threshold,
} from "@/types/traffic";

function classifyTraffic(
  delayMinutes: number,
  alternateRouteExists: boolean,
  congestionExists: boolean,
  threshold: Traffic_Threshold,
): TrafficColor {
  if (delayMinutes < threshold.greenMaxMinutes) {
    return "GREEN";
  }

  if (delayMinutes <= threshold.redOverMinutes && alternateRouteExists) {
    return "YELLOW";
  }

  if (delayMinutes > threshold.redOverMinutes || (congestionExists && !alternateRouteExists)) {
    return "RED";
  }

  return "UNKNOWN";
}

async function getDriverLocation(): Promise<Driver_Location | "USER_ACTION_REQUIRED" | "TIMEOUT"> {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    return "USER_ACTION_REQUIRED";
  }

  const timeout = new Promise<"TIMEOUT">((resolve) => {
    setTimeout(() => resolve("TIMEOUT"), 4500);
  });

  const locationPromise = Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  }).then((location) => ({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracyMeters: location.coords.accuracy ?? undefined,
    capturedAt: new Date().toISOString(),
  }));

  return Promise.race([locationPromise, timeout]);
}

async function mockTrafficService(destination: Destination): Promise<Traffic_Service_Result> {
  await new Promise((resolve) => setTimeout(resolve, 250));

  const delayOptions = [3, 5, 8, 15, 20, 24];
  const delayMinutes = delayOptions[Math.floor(Math.random() * delayOptions.length)];
  const alternateRouteExists = Math.random() > 0.35;
  const congestionExists = delayMinutes >= 8;
  const missingSpeedData = Math.random() < 0.08;

  return {
    destinationId: destination.id,
    etaMinutes: 12 + delayMinutes,
    normalMinutes: 12,
    delayMinutes,
    alternateRouteExists,
    hasSpeedReadingIntervals: !missingSpeedData,
    congestionSegments: congestionExists
      ? [{ label: delayMinutes > 15 ? "JAM" : "SLOW", startOffsetMeters: 800, endOffsetMeters: 2400 }]
      : [],
  };
}

async function backendTrafficService(
  Driver_Location: Driver_Location,
  destinations: Destination[],
  trafficServiceUrl: string,
): Promise<Traffic_Service_Result[] | null> {
  try {
    const response = await fetch(`${trafficServiceUrl}/traffic/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Driver_Location,
        destinations: destinations.map((destination) => ({
          id: destination.id,
          latitude: destination.latitude,
          longitude: destination.longitude,
        })),
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { results?: Traffic_Service_Result[] };
    return data.results ?? null;
  } catch {
    return null;
  }
}

export async function refreshAllTraffic(state: AppState): Promise<AppState> {
  const Driver_Location = await getDriverLocation();

  if (Driver_Location === "USER_ACTION_REQUIRED") {
    return {
      ...state,
      refreshStatus: "USER_ACTION_REQUIRED",
      errorMessage: "Location permission is needed to refresh traffic.",
    };
  }

  if (Driver_Location === "TIMEOUT") {
    return {
      ...state,
      refreshStatus: "ERROR",
      destinations: state.destinations.map((destination) => ({
        ...destination,
        status: destination.lastKnownGood ? "STALE" : "UNKNOWN",
        warning: "Location timed out. Showing last known result.",
      })),
      errorMessage: "Location timed out.",
    };
  }

  const backendResults = await backendTrafficService(Driver_Location, state.destinations, state.trafficServiceUrl);
  const results = backendResults ?? (await Promise.all(state.destinations.map((destination) => mockTrafficService(destination))));
  const trafficDataSource = backendResults ? "REAL" : "DEMO";

  const destinations = state.destinations.map((destination) => {
    const result = results.find((item) => item.destinationId === destination.id);

    if (!result || !result.hasSpeedReadingIntervals) {
      return {
        ...destination,
        status: destination.lastKnownGood ? "STALE" : "UNKNOWN",
        trafficColor: destination.lastKnownGood?.trafficColor ?? "UNKNOWN",
        warning: "Traffic data unavailable. Last known result shown.",
      } satisfies Destination;
    }

    const congestionSegments = result.congestionSegments ?? [];
    const trafficColor = classifyTraffic(
      result.delayMinutes,
      result.alternateRouteExists,
      congestionSegments.some((segment) => segment.label === "SLOW" || segment.label === "JAM"),
      state.Traffic_Threshold,
    );

    const nextDestination: Destination = {
      ...destination,
      status: "READY",
      trafficColor,
      delayMinutes: result.delayMinutes,
      etaMinutes: result.etaMinutes,
      normalMinutes: result.normalMinutes,
      alternateRouteExists: result.alternateRouteExists,
      congestionSegments,
      warning: result.alternateRouteExists ? undefined : "No alternate route",
      updatedAt: new Date().toISOString(),
    };

    return {
      ...nextDestination,
      lastKnownGood: nextDestination,
    };
  });

  return {
    ...state,
    Driver_Location,
    destinations,
    trafficDataSource,
    refreshStatus: "READY",
    lastRefreshAt: new Date().toISOString(),
    errorMessage: undefined,
  };
}

export const errorHandlingMatrix = [
  {
    event: "403 API error",
    appReaction: "Mark affected cards UNKNOWN, show an API warning, keep last good check.",
  },
  {
    event: "Location Timeout",
    appReaction: "Show old checks, keep the previous result, ask the driver to refresh again.",
  },
  {
    event: "0 Alternate Routes",
    appReaction: "If congestion exists, show red. Otherwise use the driver's extra-minute limits.",
  },
];
