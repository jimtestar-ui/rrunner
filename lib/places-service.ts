import { PlaceSearchResult } from "@/types/traffic";

export async function searchPlaces(query: string, trafficServiceUrl: string): Promise<PlaceSearchResult[]> {
  if (query.trim().length < 3) {
    return [];
  }

  const response = await fetch(`${trafficServiceUrl}/places/search?query=${encodeURIComponent(query.trim())}`);

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { results?: PlaceSearchResult[] };
  return data.results ?? [];
}
