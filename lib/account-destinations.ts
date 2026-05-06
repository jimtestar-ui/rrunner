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

export function mapAccountDestination(destination: AccountDestinationRow): Destination {
  return {
    id: destination.source_local_id ?? destination.id,
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
