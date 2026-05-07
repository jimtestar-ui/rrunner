import { Destination } from "@/types/traffic";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

const dotColors = {
  GREEN: "#07c76d",
  YELLOW: "#ffed39",
  RED: "#ff3b30",
  UNKNOWN: "#d5d8dc",
};

interface Props {
  destination: Destination;
  compact: boolean;
  ultraCompact: boolean;
  tileWidth: number;
  showQuip: boolean;
}

export function DestinationTile({ destination, compact, ultraCompact, tileWidth, showQuip }: Props) {
  const delay = destination.delayMinutes === null ? "--" : `+ ${destination.delayMinutes} MIN`;
  const backgroundColor = destination.cardColor || "#0b9db9";
  const dotColor = dotColors[destination.trafficColor] ?? dotColors.UNKNOWN;
  const reasonLabel = showQuip ? getWittyLabel(destination) : getDefaultLabel(destination);

  return (
    <Pressable
      onPress={() => router.push(`/destination/${destination.id}`)}
      style={{
        width: tileWidth,
        backgroundColor,
        borderRadius: 8,
        borderCurve: "continuous",
        padding: ultraCompact ? 6 : 8,
        minHeight: ultraCompact ? 58 : compact ? 82 : 106,
        justifyContent: "space-between",
      }}
    >
      <View>
        <Text
          numberOfLines={1}
          ellipsizeMode="clip"
          selectable
          style={{
            color: "#ffffff",
            fontSize: ultraCompact ? 13 : compact ? 16 : 18,
            fontWeight: "900",
            lineHeight: ultraCompact ? 16 : compact ? 19 : 22,
            textTransform: "uppercase",
          }}
        >
          {destination.nickname}
        </Text>
        {!ultraCompact ? (
          <Text
            numberOfLines={1}
            ellipsizeMode="clip"
            selectable
            style={{ color: "#ffffff", fontSize: compact ? 12 : 14, lineHeight: compact ? 15 : 17 }}
          >
            {destination.name}
          </Text>
        ) : null}
        {reasonLabel ? (
          <Text numberOfLines={1} selectable style={{ color: "#ffffff", fontSize: compact ? 11 : 12, fontWeight: "800" }}>
            {reasonLabel}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <View
          style={{
            borderColor: "#ffffff",
            borderWidth: 2,
            borderRadius: 12,
            paddingHorizontal: 9,
            paddingVertical: 2,
            minWidth: ultraCompact ? 76 : 100,
          }}
        >
          <Text
            selectable
            style={{
              color: "#ffffff",
              fontSize: ultraCompact ? 14 : 20,
              fontWeight: "900",
              fontVariant: ["tabular-nums"],
            }}
          >
            {delay}
          </Text>
        </View>
        <View
          style={{
            width: ultraCompact ? 24 : 34,
            height: ultraCompact ? 24 : 34,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: "#ffffff",
            backgroundColor: dotColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {destination.trafficColor === "UNKNOWN" ? (
            <Text style={{ color: "#5f6670", fontSize: ultraCompact ? 12 : 16, fontWeight: "900" }}>?</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function getDefaultLabel(destination: Destination) {
  if (destination.status === "STALE") {
    return "Old Intel";
  }

  if (destination.trafficColor === "UNKNOWN") {
    return "Check Needed";
  }

  if (destination.trafficColor === "GREEN") {
    return "Smooth Sailing";
  }

  if (destination.trafficColor === "YELLOW") {
    return "Alt Route";
  }

  if (destination.trafficColor === "RED") {
    return "Jam";
  }

  return "";
}

function getWittyLabel(destination: Destination) {
  if (destination.status === "STALE") {
    return "Old Intel";
  }

  if (destination.trafficColor === "UNKNOWN") {
    return "Check Needed";
  }

  if (destination.trafficColor === "GREEN") {
    return "Smooth Sailing";
  }

  if (destination.trafficColor === "YELLOW") {
    if (destination.alternateRouteExists === false) {
      return "Watch It";
    }

    if (destination.delayMinutes !== null && destination.delayMinutes >= 10) {
      return "Detour Smart";
    }

    return "Worth a Look";
  }

  if (destination.trafficColor === "RED") {
    if (destination.alternateRouteExists === false) {
      return "No Go Zone";
    }

    if ((destination.congestionSegments ?? []).some((segment) => segment.label === "JAM")) {
      return "Gridlock City";
    }

    return "Money Trap";
  }

  return "";
}
