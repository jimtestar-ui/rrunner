import { supabase } from "@/lib/supabase";
import { Destination } from "@/types/traffic";

type AccountDestinationRow = {
  id: string;
  source_local_id: string | null;
  name: string;
  address: string;
  place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  nickname: string;
  card_color: string | null;
  is_priority: boolean | null;
};

export async function loadSavedAccountDestinations(userId: string) {
  const { data, error } = await supabase
    .from("destinations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return {
    destinations: (data ?? []).map(mapAccountDestination),
    error,
  };
}

export async function getAccountLocationLimit(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("location_limit")
    .eq("id", userId)
    .single();

  return {
    locationLimit: data?.location_limit ?? 2,
    error,
  };
}

export async function getSavedAccountDestinationCount(userId: string) {
  const { count, error } = await supabase
    .from("destinations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return {
    count: count ?? 0,
    error,
  };
}

export async function saveAccountDestination(userId: string, destination: Destination) {
  const { data, error } = await supabase
    .from("destinations")
    .upsert(
      {
        id: destination.accountDestinationId,
        source_local_id: destination.id,
        user_id: userId,
        name: destination.name,
        nickname: destination.nickname,
        address: destination.address,
        place_id: destination.placeId,
        latitude: destination.latitude,
        longitude: destination.longitude,
        card_color: destination.cardColor,
        is_priority: destination.isPriority,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,source_local_id" },
    )
    .select("*")
    .single();

  return {
    destination: data ? mapAccountDestination(data) : null,
    error,
  };
}

export async function deleteAccountDestination(userId: string, destination: Destination) {
  const query = supabase.from("destinations").delete().eq("user_id", userId);

  if (destination.accountDestinationId) {
    return query.eq("id", destination.accountDestinationId);
  }

  return query.eq("source_local_id", destination.id);
}

export function mapAccountDestination(destination: AccountDestinationRow): Destination {
  return {
    id: destination.source_local_id ?? destination.id,
    accountDestinationId: destination.id,
    name: destination.name,
    address: destination.address,
    placeId: destination.place_id ?? undefined,
    latitude: destination.latitude ?? undefined,
    longitude: destination.longitude ?? undefined,
    nickname: destination.nickname,
    cardColor: destination.card_color ?? "#0b9db9",
    isPriority: destination.is_priority ?? false,
    status: "IDLE",
    trafficColor: "UNKNOWN",
    delayMinutes: null,
    etaMinutes: null,
    normalMinutes: null,
    alternateRouteExists: null,
    congestionSegments: [],
  };
}

export function mergeSavedDestinationsWithTraffic(
  savedDestinations: Destination[],
  currentDestinations: Destination[],
) {
  return savedDestinations.map((savedDestination) => {
    const currentDestination = currentDestinations.find((destination) =>
      destination.accountDestinationId
        ? destination.accountDestinationId === savedDestination.accountDestinationId
        : destination.id === savedDestination.id,
    );

    if (!currentDestination || !isSameRouteTarget(savedDestination, currentDestination)) {
      return savedDestination;
    }

    return {
      ...savedDestination,
      status: currentDestination.status,
      trafficColor: currentDestination.trafficColor,
      delayMinutes: currentDestination.delayMinutes,
      etaMinutes: currentDestination.etaMinutes,
      normalMinutes: currentDestination.normalMinutes,
      alternateRouteExists: currentDestination.alternateRouteExists,
      congestionSegments: currentDestination.congestionSegments,
      lastKnownGood: currentDestination.lastKnownGood,
      warning: currentDestination.warning,
      updatedAt: currentDestination.updatedAt,
    };
  });
}

function isSameRouteTarget(first: Destination, second: Destination) {
  if (first.placeId || second.placeId) {
    return first.placeId === second.placeId;
  }

  if (typeof first.latitude === "number" && typeof first.longitude === "number") {
    return first.latitude === second.latitude && first.longitude === second.longitude;
  }

  return first.address === second.address;
}
