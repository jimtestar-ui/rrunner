import { searchPlaces } from "@/lib/places-service";
import { useAppStore } from "@/lib/app-store";
import { PlaceSearchResult } from "@/types/traffic";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

interface Props {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  onSelectPlace: (place: PlaceSearchResult) => void;
}

export function PlaceSearch({ label = "SEARCH GOOGLE PLACES", value, onChangeText, onSelectPlace }: Props) {
  const { state } = useAppStore();
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSearch() {
    setLoading(true);
    setMessage("");

    try {
      const nextResults = await searchPlaces(value, state.trafficServiceUrl);
      setResults(nextResults);
      setMessage(nextResults.length === 0 ? "No Google places found. Try a more specific search." : "");
    } catch {
      setResults([]);
      setMessage(`Place search failed. Check Traffic Service URL: ${state.trafficServiceUrl}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: "#24282b", fontSize: 15, fontWeight: "900", letterSpacing: 3 }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search a store, airport, address, or hotspot"
          style={{
            backgroundColor: "#e8e8e8",
            borderRadius: 5,
            borderCurve: "continuous",
            color: "#24282b",
            flex: 1,
            fontSize: 17,
            minHeight: 56,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        />
        <Pressable
          onPress={handleSearch}
          disabled={loading}
          style={{
            alignItems: "center",
            backgroundColor: "#24282b",
            borderRadius: 6,
            justifyContent: "center",
            minWidth: 92,
            paddingHorizontal: 14,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "900" }}>Search</Text>
          )}
        </Pressable>
      </View>

      {message ? (
        <Text selectable style={{ color: "#b54708", fontSize: 13, fontWeight: "800" }}>
          {message}
        </Text>
      ) : null}

      {results.map((place) => (
        <Pressable
          key={place.placeId}
          onPress={() => {
            onSelectPlace(place);
            setResults([]);
          }}
          style={{ backgroundColor: "#f1f1f1", borderRadius: 8, padding: 12, gap: 3 }}
        >
          <Text selectable style={{ color: "#24282b", fontSize: 15, fontWeight: "900" }}>
            {place.name}
          </Text>
          <Text selectable numberOfLines={2} style={{ color: "#5f6670", fontSize: 13 }}>
            {place.address}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
