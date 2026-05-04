import { BrandHeader } from "@/components/brand-header";
import { useAppStore } from "@/lib/app-store";
import { PlanType } from "@/types/traffic";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

export default function OwnerToolsScreen() {
  const { state, setPlanType, addBetaTester, updateTrafficServiceUrl } = useAppStore();
  const [email, setEmail] = useState("");
  const [testerPlan, setTesterPlan] = useState<PlanType>("PRO");
  const [trafficServiceUrl, setTrafficServiceUrl] = useState(state.trafficServiceUrl);

  function handleAddTester() {
    const didAdd = addBetaTester(email, testerPlan);

    if (!didAdd) {
      Alert.alert("Check Email", "Enter a new beta tester email address.");
      return;
    }

    setEmail("");
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <BrandHeader />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 18 }}>
        <Text selectable style={{ color: "#24282b", fontSize: 32, fontWeight: "900", textAlign: "center" }}>
          Owner Tools
        </Text>
        <Text selectable style={{ color: "#5f6670", fontSize: 14, fontWeight: "800", textAlign: "center" }}>
          Local testing controls now. Later this becomes your real admin dashboard.
        </Text>

        <View style={{ backgroundColor: "#f1f1f1", borderRadius: 8, padding: 16, gap: 12 }}>
          <Text selectable style={{ color: "#24282b", fontSize: 18, fontWeight: "900" }}>
            Your Test Account
          </Text>
          <Text selectable style={{ color: "#5f6670", fontSize: 13 }}>
            Current device plan: {state.plan.type}
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => setPlanType("PRO")}
              style={{
                alignItems: "center",
                backgroundColor: state.plan.type === "PRO" ? "#0b9db9" : "#ffffff",
                borderColor: "#0b9db9",
                borderRadius: 8,
                borderWidth: 2,
                flex: 1,
                paddingVertical: 14,
              }}
            >
              <Text style={{ color: state.plan.type === "PRO" ? "#ffffff" : "#0b9db9", fontSize: 16, fontWeight: "900" }}>
                Set Me Pro
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPlanType("FREE")}
              style={{
                alignItems: "center",
                backgroundColor: state.plan.type === "FREE" ? "#24282b" : "#ffffff",
                borderColor: "#24282b",
                borderRadius: 8,
                borderWidth: 2,
                flex: 1,
                paddingVertical: 14,
              }}
            >
              <Text style={{ color: state.plan.type === "FREE" ? "#ffffff" : "#24282b", fontSize: 16, fontWeight: "900" }}>
                Test Free
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ backgroundColor: "#f1f1f1", borderRadius: 8, padding: 16, gap: 12 }}>
          <Text selectable style={{ color: "#24282b", fontSize: 18, fontWeight: "900" }}>
            Traffic Service URL
          </Text>
          <Text selectable style={{ color: "#5f6670", fontSize: 13 }}>
            Browser preview can use localhost. Same-Wi-Fi phone testing uses your PC address. Road testing uses your hosted HTTPS traffic service URL.
          </Text>
          <TextInput
            value={trafficServiceUrl}
            onChangeText={setTrafficServiceUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://your-road-test-url.vercel.app"
            style={{ backgroundColor: "#ffffff", borderRadius: 6, fontSize: 16, padding: 14 }}
          />
          <Pressable
            onPress={() => updateTrafficServiceUrl(trafficServiceUrl)}
            style={{ alignItems: "center", backgroundColor: "#0b9db9", borderRadius: 8, paddingVertical: 14 }}
          >
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>Save Traffic Service URL</Text>
          </Pressable>
          <Text selectable style={{ color: "#5f6670", fontSize: 12 }}>
            Current: {state.trafficServiceUrl}
          </Text>
        </View>

        <View style={{ backgroundColor: "#f1f1f1", borderRadius: 8, padding: 16, gap: 12 }}>
          <Text selectable style={{ color: "#24282b", fontSize: 18, fontWeight: "900" }}>
            Beta Testers
          </Text>
          <Text selectable style={{ color: "#5f6670", fontSize: 13 }}>
            Track who should get early access. This does not send invites yet.
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="tester@email.com"
            style={{ backgroundColor: "#ffffff", borderRadius: 6, fontSize: 18, padding: 14 }}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => setTesterPlan("PRO")}
              style={{
                alignItems: "center",
                backgroundColor: testerPlan === "PRO" ? "#0b9db9" : "#ffffff",
                borderColor: "#0b9db9",
                borderRadius: 8,
                borderWidth: 2,
                flex: 1,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: testerPlan === "PRO" ? "#ffffff" : "#0b9db9", fontWeight: "900" }}>
                Pro Tester
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTesterPlan("FREE")}
              style={{
                alignItems: "center",
                backgroundColor: testerPlan === "FREE" ? "#24282b" : "#ffffff",
                borderColor: "#24282b",
                borderRadius: 8,
                borderWidth: 2,
                flex: 1,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: testerPlan === "FREE" ? "#ffffff" : "#24282b", fontWeight: "900" }}>
                Free Tester
              </Text>
            </Pressable>
          </View>
          <Pressable onPress={handleAddTester} style={{ alignItems: "center", backgroundColor: "#0b9db9", borderRadius: 8, paddingVertical: 14 }}>
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>Add Beta Tester</Text>
          </Pressable>
          {state.betaTesters.map((tester) => (
            <View key={tester.id} style={{ backgroundColor: "#ffffff", borderRadius: 6, padding: 12, gap: 3 }}>
              <Text selectable style={{ color: "#24282b", fontSize: 15, fontWeight: "900" }}>
                {tester.email}
              </Text>
              <Text selectable style={{ color: "#5f6670", fontSize: 12 }}>
                {tester.planType} access - {tester.status.toLowerCase()}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => router.replace("/settings")}
          style={{ alignItems: "center", backgroundColor: "#0b9db9", borderRadius: 8, paddingVertical: 16 }}
        >
          <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "900" }}>Back to Setup</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
