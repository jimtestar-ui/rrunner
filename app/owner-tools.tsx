import { BrandHeader } from "@/components/brand-header";
import { useAppStore } from "@/lib/app-store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { PlanType } from "@/types/traffic";
import { Session } from "@supabase/supabase-js";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

type AdminProfile = {
  id: string;
  email: string | null;
  plan_type: string;
  location_limit: number;
  is_admin: boolean;
  created_at: string;
};

const primaryButton = {
  alignItems: "center" as const,
  backgroundColor: "#0b9db9",
  borderRadius: 8,
  paddingVertical: 14,
};

export default function OwnerToolsScreen() {
  const { state, setPlanType, addBetaTester, updateTrafficServiceUrl } = useAppStore();
  const [email, setEmail] = useState("");
  const [testerPlan, setTesterPlan] = useState<PlanType>("PRO");
  const [trafficServiceUrl, setTrafficServiceUrl] = useState(state.trafficServiceUrl);
  const [supabaseStatus, setSupabaseStatus] = useState("Not checked");
  const [session, setSession] = useState<Session | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<AdminProfile | null>(null);
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [adminStatus, setAdminStatus] = useState("Not checked");
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user.id) {
        loadOwnerProfile(data.session.user.id);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUsers([]);
      setOwnerProfile(null);
      if (nextSession?.user.id) {
        loadOwnerProfile(nextSession.user.id);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  function handleAddTester() {
    const didAdd = addBetaTester(email, testerPlan);

    if (!didAdd) {
      Alert.alert("Check Email", "Enter a new beta tester email address.");
      return;
    }

    setEmail("");
  }

  async function handleSupabaseCheck() {
    if (!isSupabaseConfigured) {
      setSupabaseStatus("Missing Supabase URL or publishable key in .env.");
      return;
    }

    setSupabaseStatus("Checking...");
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (error) {
      setSupabaseStatus(`Connection failed: ${error.message}`);
      return;
    }

    setSupabaseStatus("Connected to Supabase.");
  }

  async function loadOwnerProfile(userId = session?.user.id) {
    if (!userId) {
      setAdminStatus("Sign in first, then open Owner Tools.");
      return;
    }

    setAdminLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, plan_type, location_limit, is_admin, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      setAdminLoading(false);
      setAdminStatus(`Owner check failed: ${error.message}`);
      return;
    }

    setOwnerProfile(data ?? null);

    if (!data?.is_admin) {
      setAdminLoading(false);
      setAdminStatus("Signed in, but this account is not marked as admin.");
      return;
    }

    await loadUsers();
  }

  async function loadUsers() {
    setAdminLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, plan_type, location_limit, is_admin, created_at")
      .order("created_at", { ascending: false });
    setAdminLoading(false);

    if (error) {
      setAdminStatus(`User list failed: ${error.message}. Run docs/supabase-admin-tools-phase1.sql in Supabase.`);
      return;
    }

    setUsers(data ?? []);
    setAdminStatus(`Loaded ${data?.length ?? 0} users.`);
  }

  async function updateUserPlan(userId: string, planType: PlanType) {
    const locationLimit = planType === "PRO" ? 10 : 2;

    setAdminLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        plan_type: planType,
        location_limit: locationLimit,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      setAdminLoading(false);
      setAdminStatus(`Plan update failed: ${error.message}`);
      return;
    }

    await loadUsers();
    setAdminStatus(`Updated user to ${planType}.`);
  }

  const isAdmin = ownerProfile?.is_admin === true;

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <BrandHeader />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 18 }}>
        <Text selectable style={{ color: "#24282b", fontSize: 32, fontWeight: "900", textAlign: "center" }}>
          Owner Tools
        </Text>
        <Text selectable style={{ color: "#5f6670", fontSize: 14, fontWeight: "800", textAlign: "center" }}>
          Manage test users and app setup from one place.
        </Text>

        <View style={{ backgroundColor: "#f1f1f1", borderRadius: 8, padding: 16, gap: 12 }}>
          <Text selectable style={{ color: "#24282b", fontSize: 18, fontWeight: "900" }}>
            Admin Users
          </Text>
          <Text selectable style={{ color: "#5f6670", fontSize: 13 }}>
            {session ? `Signed in as ${session.user.email}` : "Sign in from Account first."}
          </Text>
          <Text selectable style={{ color: isAdmin ? "#087f5b" : "#5f6670", fontSize: 13, fontWeight: "800" }}>
            {isAdmin ? "Admin access active." : adminStatus}
          </Text>
          <Pressable
            onPress={() => loadOwnerProfile()}
            disabled={adminLoading}
            style={({ pressed }) => [
              primaryButton,
              (pressed || adminLoading) && { opacity: 0.65, transform: [{ scale: 0.99 }] },
            ]}
          >
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>
              {adminLoading ? "Loading..." : "Refresh Users"}
            </Text>
          </Pressable>

          {users.map((user) => (
            <View key={user.id} style={{ backgroundColor: "#ffffff", borderRadius: 6, padding: 12, gap: 8 }}>
              <Text selectable style={{ color: "#24282b", fontSize: 15, fontWeight: "900" }}>
                {user.email ?? "No email"}
              </Text>
              <Text selectable style={{ color: "#5f6670", fontSize: 12 }}>
                {user.plan_type} - {user.location_limit} locations{user.is_admin ? " - admin" : ""}
              </Text>
              <Text selectable style={{ color: "#5f6670", fontSize: 12 }}>
                Created {new Date(user.created_at).toLocaleDateString()}
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => updateUserPlan(user.id, "PRO")}
                  disabled={adminLoading || user.plan_type === "PRO"}
                  style={({ pressed }) => [
                    {
                      alignItems: "center",
                      backgroundColor: user.plan_type === "PRO" ? "#0b9db9" : "#ffffff",
                      borderColor: "#0b9db9",
                      borderRadius: 8,
                      borderWidth: 2,
                      flex: 1,
                      paddingVertical: 10,
                    },
                    (pressed || adminLoading) && { opacity: 0.65, transform: [{ scale: 0.99 }] },
                  ]}
                >
                  <Text style={{ color: user.plan_type === "PRO" ? "#ffffff" : "#0b9db9", fontWeight: "900" }}>
                    Pro
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => updateUserPlan(user.id, "FREE")}
                  disabled={adminLoading || user.plan_type === "FREE"}
                  style={({ pressed }) => [
                    {
                      alignItems: "center",
                      backgroundColor: user.plan_type === "FREE" ? "#24282b" : "#ffffff",
                      borderColor: "#24282b",
                      borderRadius: 8,
                      borderWidth: 2,
                      flex: 1,
                      paddingVertical: 10,
                    },
                    (pressed || adminLoading) && { opacity: 0.65, transform: [{ scale: 0.99 }] },
                  ]}
                >
                  <Text style={{ color: user.plan_type === "FREE" ? "#ffffff" : "#24282b", fontWeight: "900" }}>
                    Free
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

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
            Supabase Connection
          </Text>
          <Text selectable style={{ color: "#5f6670", fontSize: 13 }}>
            Confirms this app can reach your RoadeRunner Supabase project.
          </Text>
          <Pressable
            onPress={handleSupabaseCheck}
            style={{ alignItems: "center", backgroundColor: "#0b9db9", borderRadius: 8, paddingVertical: 14 }}
          >
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>Check Supabase</Text>
          </Pressable>
          <Text selectable style={{ color: supabaseStatus.includes("failed") || supabaseStatus.includes("Missing") ? "#b42318" : "#5f6670", fontSize: 12 }}>
            {supabaseStatus}
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
