import { BrandHeader } from "@/components/brand-header";
import { useAppStore } from "@/lib/app-store";
import { errorHandlingMatrix } from "@/lib/traffic-service";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

export default function SettingsScreen() {
  const { state, updateThresholds, setPlanType } = useAppStore();
  const [greenMax, setGreenMax] = useState(String(state.Traffic_Threshold.greenMaxMinutes));
  const [redOver, setRedOver] = useState(String(state.Traffic_Threshold.redOverMinutes));

  function handleSaveThresholds() {
    updateThresholds({
      greenMaxMinutes: Math.max(1, Number(greenMax) || 5),
      redOverMinutes: Math.max(Number(greenMax) + 1, Number(redOver) || 15),
    });
  }

  function handleSaveAndReturn() {
    handleSaveThresholds();
    router.replace("/");
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <BrandHeader />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 18 }}>
        <Text selectable style={{ color: "#24282b", fontSize: 32, fontWeight: "900", textAlign: "center" }}>
          Setup
        </Text>
        <Text selectable style={{ color: "#5f6670", fontSize: 15, fontWeight: "800", textAlign: "center" }}>
          Built to help gig drivers avoid unpaid traffic time and choose better trips.
        </Text>

        <View style={{ gap: 12 }}>
          <Text selectable style={{ color: "#24282b", fontSize: 17, fontWeight: "900" }}>
            Traffic Limits
          </Text>
          <Text selectable style={{ color: "#5f6670", fontSize: 13 }}>
            Set how many extra minutes over normal drive time starts costing you money.
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <Text selectable style={{ color: "#24282b", fontWeight: "800" }}>
                Green under
              </Text>
              <TextInput
                value={greenMax}
                onChangeText={setGreenMax}
                keyboardType="number-pad"
                style={{ backgroundColor: "#e8e8e8", borderRadius: 6, fontSize: 22, padding: 14 }}
              />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text selectable style={{ color: "#24282b", fontWeight: "800" }}>
                Red over
              </Text>
              <TextInput
                value={redOver}
                onChangeText={setRedOver}
                keyboardType="number-pad"
                style={{ backgroundColor: "#e8e8e8", borderRadius: 6, fontSize: 22, padding: 14 }}
              />
            </View>
          </View>
          <Text selectable style={{ color: "#5f6670", fontSize: 13 }}>
            Default: green under +5, yellow +5 to +15, red over +15 extra minutes.
          </Text>
          <Text selectable style={{ color: "#5f6670", fontSize: 13, fontWeight: "800" }}>
            Your location is checked only when you tap refresh.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <Text selectable style={{ color: "#24282b", fontSize: 17, fontWeight: "900" }}>
            Saved Locations
          </Text>
          <View style={{ backgroundColor: "#f1f1f1", borderRadius: 8, padding: 16, gap: 10 }}>
            <Text selectable style={{ color: "#5f6670", fontSize: 13 }}>
              Save the stores, pickup zones, airports, and neighborhoods you check before accepting work.
            </Text>
            <Text selectable style={{ color: "#24282b", fontSize: 16, fontWeight: "800" }}>
              Free: 2 saved locations
            </Text>
            <Text selectable style={{ color: "#24282b", fontSize: 16, fontWeight: "800" }}>
              Pro: 10 saved locations
            </Text>
            <Text selectable style={{ color: "#5f6670", fontSize: 13 }}>
              Current plan: {state.plan.type}
            </Text>
            <Pressable onPress={() => setPlanType("PRO")} style={{ backgroundColor: "#0b9db9", borderRadius: 8, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "900" }}>Upgrade With Store Billing</Text>
            </Pressable>
            <Pressable onPress={() => setPlanType("FREE")} style={{ borderColor: "#a5abb2", borderWidth: 1, borderRadius: 8, paddingVertical: 12, alignItems: "center" }}>
              <Text style={{ color: "#24282b", fontSize: 15, fontWeight: "900" }}>Demo Free Plan</Text>
            </Pressable>
            <Text selectable style={{ color: "#5f6670", fontSize: 12 }}>
              Mobile upgrades should use Apple and Google billing first. Stripe and PayPal can support a future web account portal.
            </Text>
            <Text selectable style={{ color: "#5f6670", fontSize: 12 }}>
              Everyday drivers can use RoadeRunner to avoid traffic headaches before heading out.
            </Text>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Text selectable style={{ color: "#24282b", fontSize: 17, fontWeight: "900" }}>
            If Something Goes Wrong
          </Text>
          {errorHandlingMatrix.map((row) => (
            <View key={row.event} style={{ backgroundColor: "#f6f6f6", borderRadius: 8, padding: 12, gap: 4 }}>
              <Text selectable style={{ color: "#24282b", fontWeight: "900" }}>
                {row.event}
              </Text>
              <Text selectable style={{ color: "#5f6670" }}>
                {row.appReaction}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ gap: 10 }}>
          <Text selectable style={{ color: "#24282b", fontSize: 17, fontWeight: "900" }}>
            Owner Tools
          </Text>
          <Text selectable style={{ color: "#5f6670", fontSize: 13 }}>
            Add beta testers and mark this device as Pro while you test.
          </Text>
          <Link href="/owner-tools" asChild>
            <Pressable
              style={{
                alignItems: "center",
                borderColor: "#0b9db9",
                borderRadius: 8,
                borderWidth: 2,
                paddingVertical: 14,
              }}
            >
              <Text style={{ color: "#0b9db9", fontSize: 16, fontWeight: "900" }}>
                Open Owner Tools
              </Text>
            </Pressable>
          </Link>
        </View>

        <Pressable
          onPress={handleSaveAndReturn}
          style={{
            alignItems: "center",
            backgroundColor: "#0b9db9",
            borderRadius: 8,
            borderCurve: "continuous",
            marginTop: 8,
            paddingVertical: 18,
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "900" }}>
            Save & Return to Main Screen
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
