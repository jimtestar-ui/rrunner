import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

export function BrandHeader() {
  return (
    <View
      style={{
        backgroundColor: "#3a3a3a",
        paddingTop: 24,
        paddingHorizontal: 20,
        paddingBottom: 14,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" asChild>
          <Pressable hitSlop={12}>
            <Ionicons name="home" size={35} color="#ffffff" />
          </Pressable>
        </Link>
        <View style={{ alignItems: "center", gap: 2 }}>
          <Text style={{ color: "#ffffff", fontSize: 34, fontWeight: "900", lineHeight: 34 }}>RR</Text>
          <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "700", letterSpacing: 2 }}>FAST ROUTE BOARD</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Link href="/account" asChild>
            <Pressable hitSlop={12}>
              <Ionicons name="person-circle" size={31} color="#ffffff" />
            </Pressable>
          </Link>
          <Link href="/settings" asChild>
            <Pressable hitSlop={12}>
              <Ionicons name="settings-sharp" size={31} color="#ffffff" />
            </Pressable>
          </Link>
        </View>
      </View>
      <Text style={{ alignSelf: "center", fontSize: 30, fontWeight: "900", fontStyle: "italic" }}>
        <Text style={{ color: "#ffe124" }}>ROADE</Text>
        <Text style={{ color: "#ffffff" }}>RUNNER</Text>
      </Text>
    </View>
  );
}
