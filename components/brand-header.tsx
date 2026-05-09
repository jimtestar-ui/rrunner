import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

export function BrandHeader() {
  return (
    <View
      style={{
        backgroundColor: "#121219",
        borderBottomColor: "#252532",
        borderBottomWidth: 1,
        paddingTop: 24,
        paddingHorizontal: 18,
        paddingBottom: 10,
        gap: 7,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" asChild>
          <Pressable hitSlop={12}>
            <Ionicons name="home" size={28} color="#ffffff" />
          </Pressable>
        </Link>
        <View style={{ alignItems: "center", flex: 1, gap: 2 }}>
          <View style={{ alignItems: "center", flexDirection: "row", gap: 6 }}>
            <View style={{ alignItems: "flex-end", gap: 2, width: 30 }}>
              <Ionicons name="airplane-sharp" size={18} color="#ffffff" />
              <View style={{ backgroundColor: "#777986", height: 2, width: 20 }} />
            </View>
            <Text style={{ fontSize: 21, fontWeight: "900", letterSpacing: 1 }}>
              <Text style={{ color: "#ffe124" }}>ROADE</Text>
              <Text style={{ color: "#ffffff", fontStyle: "italic" }}>RUNNER</Text>
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Link href="/account" asChild>
            <Pressable hitSlop={12}>
              <Ionicons name="person-circle" size={27} color="#ffffff" />
            </Pressable>
          </Link>
          <Link href="/settings" asChild>
            <Pressable hitSlop={12}>
              <Ionicons name="settings-sharp" size={27} color="#ffffff" />
            </Pressable>
          </Link>
        </View>
      </View>
      <Text style={{ alignSelf: "center", color: "#777986", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 }}>
        LIVE TRAFFIC - TAP REFRESH TO UPDATE
      </Text>
    </View>
  );
}
