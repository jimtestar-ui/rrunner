import { BrandHeader } from "@/components/brand-header";
import { DestinationTile } from "@/components/destination-tile";
import { useAppStore } from "@/lib/app-store";
import { refreshAllTraffic } from "@/lib/traffic-service";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { useMemo } from "react";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function QuickScanScreen() {
  const { state, setState, addTrafficCheckLog } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const count = state.destinations.length;
  const compact = count > 8 || height < 760;
  const ultraCompact = count > 20 || height < 650;
  const tileWidth = Math.max(150, Math.floor((width - 24) / 2));
  const sortedDestinations = useMemo(
    () =>
      [...state.destinations].sort((first, second) => {
        if (first.isPriority === second.isPriority) {
          return 0;
        }

        return first.isPriority ? -1 : 1;
      }),
    [state.destinations],
  );
  const hasTrafficResults = state.destinations.some((destination) => destination.delayMinutes !== null);

  async function handleRefresh() {
    setRefreshing(true);
    const nextState = await refreshAllTraffic({ ...state, refreshStatus: "LOADING" });
    setState(nextState);
    setRefreshing(false);

    if (nextState.refreshStatus === "USER_ACTION_REQUIRED") {
      triggerRefreshFeedback("warning");
      Alert.alert("Location Needed", "Turn on foreground location permission to refresh traffic.");
      return;
    }

    triggerRefreshFeedback(nextState.destinations.some((destination) => destination.trafficColor === "RED") ? "warning" : "success");
    nextState.destinations.forEach((destination) => {
      addTrafficCheckLog({
        destinationId: destination.id,
        destinationName: destination.nickname,
        normalMinutes: destination.normalMinutes,
        etaMinutes: destination.etaMinutes,
        delayMinutes: destination.delayMinutes,
        trafficColor: destination.trafficColor,
      });
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#07080b" }}>
      <BrandHeader />
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 8, gap: 10, paddingBottom: 16 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2 }}>
          <Link href="/add-destination" asChild>
            <Pressable>
              <Text style={{ color: "#32d36b", fontSize: 13, fontWeight: "900" }}>ADD LOCATION</Text>
            </Pressable>
          </Link>
          <Text selectable style={{ color: "#ffffff", fontSize: 13, fontWeight: "900", textAlign: "right" }}>
            {count} / {state.plan.locationLimit} locations
          </Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {sortedDestinations.map((destination) => (
            <DestinationTile
              key={destination.id}
              destination={destination}
              compact={compact}
              ultraCompact={ultraCompact}
              tileWidth={tileWidth}
              showQuip={state.wittyModeEnabled}
            />
          ))}
        </View>

        {count === 0 ? (
          <View style={{ alignItems: "center", backgroundColor: "#171923", borderRadius: 8, gap: 10, padding: 18 }}>
            <Text selectable style={{ color: "#ffffff", fontSize: 18, fontWeight: "900", textAlign: "center" }}>
              No saved locations yet
            </Text>
            <Text selectable style={{ color: "#b9bdc6", fontSize: 13, fontWeight: "800", textAlign: "center" }}>
              Add a destination to start checking traffic before accepting a trip.
            </Text>
            <Link href="/add-destination" asChild>
              <Pressable style={{ alignItems: "center", backgroundColor: "#32d36b", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12 }}>
                <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "900" }}>Add Location</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}

        <Text selectable style={{ color: "#8f94a0", fontSize: 12, fontWeight: "900", textAlign: "center" }}>
          {hasTrafficResults
            ? `Your last check was ${formatFreshness(state.lastRefreshAt)}. Traffic info by ${formatTrafficProvider(state.trafficDataSource)}`
            : `Tap refresh for current traffic. Traffic info by ${formatTrafficProvider(state.trafficDataSource)}`}
        </Text>

        <View style={{ alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "center", paddingBottom: 4 }}>
          <LegendDot color="#36df67" label="CLEAR" />
          <LegendDot color="#ffd326" label="SLOW" />
          <LegendDot color="#ff3a45" label="STOP" />
        </View>

        {count > 0 && sortedDestinations.length === 0 ? (
          <Text selectable style={{ color: "#b42318", fontSize: 13, fontWeight: "800", textAlign: "center" }}>
            Saved locations need a refresh. Restart the app and try again.
          </Text>
        ) : null}

        {state.errorMessage ? (
          <Text selectable style={{ color: "#b42318", fontSize: 13, fontWeight: "700", textAlign: "center" }}>
            {state.errorMessage}
          </Text>
        ) : null}
      </ScrollView>
      <View
        style={{
          alignItems: "center",
          backgroundColor: "#07080b",
          borderTopColor: "#151821",
          borderTopWidth: 1,
          flexShrink: 0,
          paddingBottom: Math.max(18, insets.bottom + 7),
          paddingHorizontal: 10,
          paddingTop: 8,
        }}
      >
        <Pressable
          onPress={handleRefresh}
          disabled={refreshing}
          style={{
            alignItems: "center",
            backgroundColor: "#32d36b",
            borderRadius: 999,
            justifyContent: "center",
            width: 58,
            height: 58,
            shadowColor: "#32d36b",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
          }}
        >
          {refreshing ? (
            <ActivityIndicator color="#08100b" size="large" />
          ) : (
            <Ionicons name="refresh" size={31} color="#08210f" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: 4 }}>
      <View style={{ backgroundColor: color, borderRadius: 5, height: 10, width: 10 }} />
      <Text style={{ color: "#8f94a0", fontSize: 10, fontWeight: "900" }}>{label}</Text>
    </View>
  );
}

function formatFreshness(lastRefreshAt?: string) {
  if (!lastRefreshAt) {
    return "not checked yet";
  }

  const elapsedMinutes = Math.floor((Date.now() - new Date(lastRefreshAt).getTime()) / 60000);

  if (elapsedMinutes < 1) {
    return "just now";
  }

  if (elapsedMinutes === 1) {
    return "1 min ago";
  }

  return `${elapsedMinutes} min ago`;
}

function formatTrafficProvider(source: "REAL" | "DEMO" | "UNKNOWN") {
  if (source === "REAL") {
    return "Google Maps";
  }

  if (source === "DEMO") {
    return "demo mode";
  }

  return "Google Maps";
}

function triggerRefreshFeedback(type: "success" | "warning") {
  if (process.env.EXPO_OS === "web") {
    return;
  }

  Haptics.notificationAsync(
    type === "success" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
  ).catch(() => undefined);
}
