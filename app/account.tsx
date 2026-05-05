import { BrandHeader } from "@/components/brand-header";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

export default function AccountScreen() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState("Guest mode is on. Your locations stay on this device.");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setEmail(data.session?.user.email ?? "");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setEmail(nextSession?.user.email ?? "");
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSendCode() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isSupabaseConfigured) {
      setStatus("Supabase is not configured on this device.");
      return;
    }

    if (!normalizedEmail.includes("@")) {
      Alert.alert("Email Needed", "Enter your email address first.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
      },
    });
    setLoading(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Check your email for the code. Type the code here; do not tap the localhost link.");
  }

  async function handleVerifyCode() {
    const normalizedEmail = email.trim().toLowerCase();
    const token = code.trim();

    if (!normalizedEmail.includes("@") || token.length < 4) {
      Alert.alert("Code Needed", "Enter the email and code Supabase sent you.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token,
      type: "email",
    });

    if (error) {
      setLoading(false);
      setStatus(error.message);
      return;
    }

    setSession(data.session);
    const profileError = await ensureProfile(data.session?.user.id, data.session?.user.email ?? normalizedEmail);
    setLoading(false);
    setStatus(profileError ? `Signed in, but profile setup failed: ${profileError}` : "Signed in. Next step is syncing saved locations.");
  }

  async function handleSignOut() {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setLoading(false);
    setStatus("Signed out. Guest mode is on.");
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <BrandHeader />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 18 }}>
        <Text selectable style={{ color: "#24282b", fontSize: 32, fontWeight: "900", textAlign: "center" }}>
          Account
        </Text>
        <Text selectable style={{ color: "#5f6670", fontSize: 15, fontWeight: "800", textAlign: "center" }}>
          Use RoadeRunner as a guest, or sign in to save your work zones later.
        </Text>

        <View style={{ backgroundColor: "#f1f1f1", borderRadius: 8, padding: 16, gap: 12 }}>
          <Text selectable style={{ color: "#24282b", fontSize: 18, fontWeight: "900" }}>
            {session ? "Signed In" : "Guest Mode"}
          </Text>
          <Text selectable style={{ color: "#5f6670", fontSize: 13 }}>
            {session ? session.user.email : "No account required for quick traffic checks."}
          </Text>
          <Text selectable style={{ color: status.includes("error") ? "#b42318" : "#5f6670", fontSize: 13 }}>
            {status}
          </Text>
        </View>

        {!session ? (
          <View style={{ gap: 12 }}>
            <Text selectable style={{ color: "#5f6670", fontSize: 13, fontWeight: "800" }}>
              Supabase may include a sign-in link in the email. For this beta, use the code instead.
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="your@email.com"
              style={{ backgroundColor: "#e8e8e8", borderRadius: 6, fontSize: 18, padding: 14 }}
            />
            <Pressable
              onPress={handleSendCode}
              disabled={loading}
              style={{ alignItems: "center", backgroundColor: "#0b9db9", borderRadius: 8, paddingVertical: 14 }}
            >
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>
                Send Sign-In Code
              </Text>
            </Pressable>
            <TextInput
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              placeholder="Email code"
              style={{ backgroundColor: "#e8e8e8", borderRadius: 6, fontSize: 18, padding: 14 }}
            />
            <Pressable
              onPress={handleVerifyCode}
              disabled={loading}
              style={{ alignItems: "center", borderColor: "#0b9db9", borderRadius: 8, borderWidth: 2, paddingVertical: 14 }}
            >
              <Text style={{ color: "#0b9db9", fontSize: 16, fontWeight: "900" }}>
                Verify Code
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handleSignOut}
            disabled={loading}
            style={{ alignItems: "center", borderColor: "#b42318", borderRadius: 8, borderWidth: 2, paddingVertical: 14 }}
          >
            <Text style={{ color: "#b42318", fontSize: 16, fontWeight: "900" }}>Sign Out</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => router.replace("/")}
          style={{ alignItems: "center", backgroundColor: "#0b9db9", borderRadius: 8, paddingVertical: 16 }}
        >
          <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "900" }}>Return to Main Screen</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

async function ensureProfile(userId?: string, email?: string) {
  if (!userId) {
    return "Missing user id.";
  }

  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    email,
    plan_type: "FREE",
    location_limit: 2,
    is_admin: false,
  });

  return error?.message;
}
