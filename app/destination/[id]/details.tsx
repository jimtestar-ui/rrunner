import { BrandHeader } from "@/components/brand-header";
import { useAppStore } from "@/lib/app-store";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

export default function DestinationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateTrafficCheckLogNote } = useAppStore();
  const destination = useMemo(
    () => state.destinations.find((item) => item.id === id),
    [id, state.destinations],
  );
  const recentLogs = state.trafficCheckLogs.filter((log) => log.destinationId === id).slice(0, 5);
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (!destination) {
    return (
      <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <BrandHeader />
        <View style={{ padding: 24, gap: 18 }}>
          <Text selectable style={{ color: "#24282b", fontSize: 24, fontWeight: "900" }}>Location not found</Text>
          <Pressable onPress={() => router.replace("/")} style={{ backgroundColor: "#0b9db9", borderRadius: 8, paddingVertical: 16, alignItems: "center" }}>
            <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "900" }}>Return to Main Screen</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <BrandHeader />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text selectable style={{ color: "#24282b", fontSize: 31, fontWeight: "900", textAlign: "center" }}>
          {destination.nickname}
        </Text>
        <Text selectable style={{ color: "#5f6670", fontSize: 14, textAlign: "center" }}>
          {destination.address}
        </Text>

        <View style={{ backgroundColor: "#f1f1f1", borderRadius: 8, padding: 16, gap: 10 }}>
          <Text selectable style={{ color: "#24282b", fontSize: 18, fontWeight: "900" }}>Latest Traffic Check</Text>
          <DetailRow label="Normal drive time" value={formatMinutes(destination.normalMinutes)} />
          <DetailRow label="Current drive time" value={formatMinutes(destination.etaMinutes)} />
          <DetailRow label="Extra traffic time" value={formatDelay(destination.delayMinutes)} />
          <DetailRow label="Traffic light" value={destination.trafficColor} />
          <DetailRow label="Alternate route" value={destination.alternateRouteExists === null ? "Unknown" : destination.alternateRouteExists ? "Found" : "None"} />
          <DetailRow label="Last checked" value={destination.updatedAt ? new Date(destination.updatedAt).toLocaleString() : "Not checked yet"} />
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Link href={`/destination/${destination.id}`} asChild>
            <Pressable style={{ alignItems: "center", borderColor: "#0b9db9", borderRadius: 8, borderWidth: 2, flex: 1, paddingVertical: 14 }}>
              <Text style={{ color: "#0b9db9", fontSize: 16, fontWeight: "900" }}>Edit Location</Text>
            </Pressable>
          </Link>
          <Pressable onPress={() => router.replace("/")} style={{ alignItems: "center", backgroundColor: "#0b9db9", borderRadius: 8, flex: 1, paddingVertical: 14 }}>
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>Main Screen</Text>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          <Text selectable style={{ color: "#24282b", fontSize: 18, fontWeight: "900" }}>
            Waze / Real-World Notes
          </Text>
          {recentLogs.length === 0 ? (
            <Text selectable style={{ color: "#5f6670", fontSize: 14 }}>
              Refresh traffic to start a comparison history.
            </Text>
          ) : null}
          {recentLogs.map((log) => (
            <View key={log.id} style={{ backgroundColor: "#f6f6f6", borderRadius: 8, padding: 12, gap: 8 }}>
              <Text selectable style={{ color: "#24282b", fontWeight: "900" }}>
                {new Date(log.checkedAt).toLocaleString()} • {formatDelay(log.delayMinutes)}
              </Text>
              <Text selectable style={{ color: "#5f6670", fontSize: 13 }}>
                Normal {formatMinutes(log.normalMinutes)} / Current {formatMinutes(log.etaMinutes)} / Light {log.trafficColor}
              </Text>
              <TextInput
                value={notes[log.id] ?? log.comparisonNote ?? ""}
                onChangeText={(value) => setNotes((current) => ({ ...current, [log.id]: value }))}
                placeholder="Add Waze or real-world comparison note"
                style={{ backgroundColor: "#ffffff", borderRadius: 6, fontSize: 15, minHeight: 48, padding: 10 }}
              />
              <Pressable onPress={() => updateTrafficCheckLogNote(log.id, notes[log.id] ?? log.comparisonNote ?? "")} style={{ alignItems: "center", backgroundColor: "#24282b", borderRadius: 6, paddingVertical: 10 }}>
                <Text style={{ color: "#ffffff", fontWeight: "900" }}>Save Note</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text selectable style={{ color: "#5f6670", flex: 1, fontSize: 14, fontWeight: "800" }}>{label}</Text>
      <Text selectable style={{ color: "#24282b", flex: 1, fontSize: 14, fontWeight: "900", textAlign: "right" }}>{value}</Text>
    </View>
  );
}

function formatMinutes(minutes: number | null) {
  return minutes === null ? "Unknown" : `${minutes} min`;
}

function formatDelay(minutes: number | null) {
  return minutes === null ? "Unknown" : `+${minutes} min`;
}
