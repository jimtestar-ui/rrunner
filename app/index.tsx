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

export default function QuickScanScreen() {
  const { state, setState, addTrafficCheckLog } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const { height, width } = useWindowDimensions();
  const count = state.destinations.length;
  const compact = count > 10 || height < 760;
  const ultraCompact = count > 20 || height < 650;
  const tileWidth = Math.max(150, Math.floor((width - 28) / 2));
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
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <BrandHeader />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 10, gap: 10, paddingBottom: 130 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2 }}>
          <View>
            <Text selectable style={{ color: "#24282b", fontSize: 13, fontWeight: "800" }}>
              {count} / {state.plan.locationLimit} locations
            </Text>
          </View>
          <Link href="/add-destination" asChild>
            <Pressable>
              <Text style={{ color: "#0799b7", fontSize: 14, fontWeight: "900" }}>ADD LOCATION</Text>
            </Pressable>
          </Link>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {sortedDestinations.map((destination) => (
            <DestinationTile
              key={destination.id}
              destination={destination}
              compact={compact}
              ultraCompact={ultraCompact}
              tileWidth={tileWidth}
            />
          ))}
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
          backgroundColor: "#ffffff",
          borderTopColor: "#e7e7e7",
          borderTopWidth: 1,
          paddingBottom: 18,
          paddingTop: 10,
        }}
      >
        <Pressable
          onPress={handleRefresh}
          disabled={refreshing}
          style={{
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 72,
          }}
        >
          {refreshing ? (
            <ActivityIndicator color="#00c875" size="large" />
          ) : (
            <View style={{ alignItems: "center" }}>
              <Ionicons name="car-sport" size={62} color="#00bf6f" />
              <Ionicons name="refresh" size={36} color="#ffffff" style={{ position: "absolute", top: 17 }} />
            </View>
          )}
        </Pressable>
        <Text selectable style={{ color: "#5f6670", fontSize: 13, fontWeight: "800", textAlign: "center" }}>
          Tap refresh to check your location once before you commit.
        </Text>
        <Text selectable style={{ color: "#24282b", fontSize: 12, fontWeight: "900", textAlign: "center" }}>
          {formatFreshness(state.lastRefreshAt)}
        </Text>
        <Text selectable style={{ color: "#5f6670", fontSize: 11, fontWeight: "800", textAlign: "center" }}>
          {formatTrafficSource(state.trafficDataSource)}
        </Text>
      </View>
    </View>
  );
}

function formatFreshness(lastRefreshAt?: string) {
  if (!lastRefreshAt) {
    return "Check added traffic before accepting";
  }

  const elapsedMinutes = Math.floor((Date.now() - new Date(lastRefreshAt).getTime()) / 60000);

  if (elapsedMinutes < 1) {
    return "Checked just now";
  }

  if (elapsedMinutes === 1) {
    return "Checked 1 min ago";
  }

  return `Checked ${elapsedMinutes} min ago`;
}

function formatTrafficSource(source: "REAL" | "DEMO" | "UNKNOWN") {
  if (source === "REAL") {
    return "Google traffic";
  }

  if (source === "DEMO") {
    return "Demo traffic";
  }

  return "Traffic source not checked";
}

function triggerRefreshFeedback(type: "success" | "warning") {
  if (process.env.EXPO_OS === "web") {
    return;
  }

  Haptics.notificationAsync(
    type === "success" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
  ).catch(() => undefined);
}
