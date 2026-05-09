import { Destination } from "@/types/traffic";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

const dotColors = {
  GREEN: "#36df67",
  YELLOW: "#ffd326",
  RED: "#ff3a45",
  UNKNOWN: "#8b9199",
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
        borderColor: "rgba(255, 255, 255, 0.12)",
        borderRadius: 8,
        borderWidth: 1,
        borderCurve: "continuous",
        minHeight: ultraCompact ? 58 : compact ? 84 : 116,
        overflow: "hidden",
        padding: ultraCompact ? 8 : 10,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        justifyContent: "space-between",
      }}
    >
      <View
        pointerEvents="none"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.12)",
          height: "42%",
          left: 0,
          position: "absolute",
          right: 0,
          top: 0,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.16)",
          bottom: 0,
          height: "52%",
          left: 0,
          position: "absolute",
          right: 0,
        }}
      />
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
            textShadowColor: "rgba(0, 0, 0, 0.35)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
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
            style={{ color: "#ffffff", fontSize: compact ? 12 : 13, fontWeight: "700", lineHeight: compact ? 15 : 17 }}
          >
            {destination.name}
          </Text>
        ) : null}
        {reasonLabel ? (
          <Text numberOfLines={1} selectable style={{ color: "#ffffff", fontSize: compact ? 11 : 12, fontWeight: "900" }}>
            {reasonLabel}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <View
          style={{
            borderColor: "#ffffff",
            borderWidth: 1,
            borderRadius: 999,
            backgroundColor: "rgba(0, 0, 0, 0.32)",
            minWidth: ultraCompact ? 76 : 86,
            paddingHorizontal: 9,
            paddingVertical: 4,
          }}
        >
          <Text
            selectable
            style={{
              color: "#ffffff",
              fontSize: ultraCompact ? 13 : 14,
              fontWeight: "900",
              fontVariant: ["tabular-nums"],
              lineHeight: ultraCompact ? 16 : 17,
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
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.35,
            shadowRadius: 4,
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
