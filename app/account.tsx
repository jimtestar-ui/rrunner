import { BrandHeader } from "@/components/brand-header";
import { useAppStore } from "@/lib/app-store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { Destination } from "@/types/traffic";
import { Session } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

WebBrowser.maybeCompleteAuthSession();

type AccountProfile = {
  plan_type: string;
  location_limit: number;
  is_admin: boolean;
};

type AccountDestinationRow = {
  id: string;
  source_local_id: string | null;
  name: string;
  address: string;
  place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  nickname: string;
  card_color: string | null;
  is_priority: boolean | null;
};

const primaryButton = {
  alignItems: "center" as const,
  backgroundColor: "#0b9db9",
  borderRadius: 8,
  paddingVertical: 14,
};

const outlineButton = {
  alignItems: "center" as const,
  borderColor: "#0b9db9",
  borderRadius: 8,
  borderWidth: 2,
  paddingVertical: 14,
};

const dangerButton = {
  alignItems: "center" as const,
  borderColor: "#b42318",
  borderRadius: 8,
  borderWidth: 2,
  paddingVertical: 14,
};

const googleButton = {
  alignItems: "center" as const,
  backgroundColor: "#ffffff",
  borderColor: "#24282b",
  borderRadius: 8,
  borderWidth: 2,
  paddingVertical: 14,
};

export default function AccountScreen() {
  const { state, replaceDestinations } = useAppStore();
  const googleRedirectTo = useMemo(() => makeRedirectUri({ path: "auth/callback" }), []);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [status, setStatus] = useState("Guest mode is on. Your locations stay on this device.");
  const [syncStatus, setSyncStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setEmail(data.session?.user.email ?? "");
      if (data.session?.user.id) {
        loadProfile(data.session.user.id);
        if (state.destinationAccountUserId && state.destinationAccountUserId !== data.session.user.id) {
          loadAccountDestinations(data.session.user.id);
        }
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setEmail(nextSession?.user.email ?? "");
      if (nextSession?.user.id) {
        loadProfile(nextSession.user.id);
        if (state.destinationAccountUserId && state.destinationAccountUserId !== nextSession.user.id) {
          loadAccountDestinations(nextSession.user.id);
        }
      } else {
        setProfile(null);
        replaceDestinations([], null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    setProfileLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("plan_type, location_limit, is_admin")
      .eq("id", userId)
      .maybeSingle();

    setProfileLoading(false);
    setProfile(data ?? null);
    if (error) {
      setStatus(`Plan check failed: ${error.message}`);
    }
  }

  async function loadAccountDestinations(userId: string) {
    const { data, error } = await supabase
      .from("destinations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      setSyncStatus(`Location reload failed: ${error.message}`);
      replaceDestinations([], userId);
      return;
    }

    replaceDestinations((data ?? []).map(mapAccountDestination), userId);
  }

  async function createSessionFromUrl(url: string) {
    const { params, errorCode } = QueryParams.getQueryParams(url);

    if (errorCode) {
      throw new Error(errorCode);
    }

    if (params.code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);

      if (error) {
        throw error;
      }

      return data.session;
    }

    if (params.access_token && params.refresh_token) {
      const { data, error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });

      if (error) {
        throw error;
      }

      return data.session;
    }

    return null;
  }

  async function handleGoogleSignIn() {
    if (!isSupabaseConfigured) {
      setStatus("Supabase is not configured on this device.");
      return;
    }

    setLoading(true);
    setStatus("Opening Google sign-in...");

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: googleRedirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, googleRedirectTo);

      if (result.type !== "success") {
        setStatus("Google sign-in was canceled.");
        return;
      }

      const nextSession = await createSessionFromUrl(result.url);

      if (!nextSession?.user.id) {
        setStatus("Google sign-in did not return a session.");
        return;
      }

      setSession(nextSession);
      setEmail(nextSession.user.email ?? "");
      const profileError = await ensureProfile(nextSession.user.id, nextSession.user.email ?? undefined);
      await loadProfile(nextSession.user.id);

      if (state.destinationAccountUserId && state.destinationAccountUserId !== nextSession.user.id) {
        await loadAccountDestinations(nextSession.user.id);
      }

      setStatus(profileError ? `Signed in, but profile setup failed: ${profileError}` : "Signed in with Google.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

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
    if (data.session?.user.id) {
      await loadProfile(data.session.user.id);
    }
    setLoading(false);
    setStatus(profileError ? `Signed in, but profile setup failed: ${profileError}` : "Signed in.");
  }

  async function handleSaveGuestLocations() {
    if (!session?.user.id) {
      setSyncStatus("Sign in first.");
      return;
    }

    if (state.destinations.length === 0) {
      setSyncStatus("No guest locations to save yet.");
      return;
    }

    setLoading(true);
    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("plan_type, location_limit, is_admin")
      .eq("id", session.user.id)
      .single();

    const locationLimit = currentProfile?.location_limit ?? 2;
    const locationsToSave = state.destinations.slice(0, locationLimit);
    const skippedCount = Math.max(0, state.destinations.length - locationsToSave.length);

    if (profileError) {
      setLoading(false);
      setSyncStatus(`Plan check failed: ${profileError.message}`);
      return;
    }

    setProfile({
      plan_type: currentProfile.plan_type ?? "FREE",
      location_limit: locationLimit,
      is_admin: currentProfile.is_admin ?? false,
    });

    const savedDestinations = locationsToSave.map((destination) => ({
      source_local_id: destination.id,
      user_id: session.user.id,
      name: destination.name,
      nickname: destination.nickname,
      address: destination.address,
      place_id: destination.placeId,
      latitude: destination.latitude,
      longitude: destination.longitude,
      card_color: destination.cardColor,
      is_priority: destination.isPriority,
    }));

    const { error } = await supabase.from("destinations").upsert(
      savedDestinations,
      { onConflict: "user_id,source_local_id" },
    );
    const { data: accountDestinations, error: loadError } = error
      ? { data: null, error: null }
      : await supabase
          .from("destinations")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true });
    setLoading(false);

    if (error) {
      setSyncStatus(`Save failed: ${error.message}`);
      return;
    }

    if (loadError) {
      setSyncStatus(`Saved, but reload failed: ${loadError.message}`);
      return;
    }

    replaceDestinations(
      (accountDestinations ?? []).map(mapAccountDestination),
      session.user.id,
    );
    setSyncStatus(
      skippedCount > 0
        ? `Saved ${locationsToSave.length}. Upgrade to Pro to save the other ${skippedCount}.`
        : `Saved ${locationsToSave.length} locations to your account.`,
    );
  }

  async function handleSignOut() {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    replaceDestinations([], null);
    setLoading(false);
    setStatus("Signed out. Guest mode is on.");
  }

  const planType = profile?.plan_type === "PRO" ? "PRO" : profile?.plan_type === "FREE" ? "FREE" : null;
  const planLabel = planType === "PRO" ? "Pro" : "Free";
  const locationLimit = profile?.location_limit ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <BrandHeader />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 18 }}>
        <Text selectable style={{ color: "#24282b", fontSize: 32, fontWeight: "900", textAlign: "center" }}>
          Account
        </Text>
        <Text selectable style={{ color: "#5f6670", fontSize: 15, fontWeight: "800", textAlign: "center" }}>
          {session
            ? "Your saved destinations are connected to this account."
            : "Use RoadeRunner as a guest, or sign in to save destinations."}
        </Text>

        <View style={{ backgroundColor: "#f1f1f1", borderRadius: 8, padding: 16, gap: 12 }}>
          <Text selectable style={{ color: "#24282b", fontSize: 18, fontWeight: "900" }}>
            {session ? (planType ? `${planLabel} Account` : "Checking Account") : "Guest Mode"}
          </Text>
          <Text selectable style={{ color: "#5f6670", fontSize: 13 }}>
            {session ? session.user.email : "No account required for quick traffic checks."}
          </Text>
          {session ? (
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: planType === "PRO" ? "#ffe03d" : "#ffffff",
                borderColor: planType === "PRO" ? "#24282b" : "#c8ccd1",
                borderRadius: 999,
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: "#24282b", fontSize: 13, fontWeight: "900" }}>
                {planType === "PRO"
                  ? `PRO PLAN - ${locationLimit} saved locations`
                  : planType === "FREE"
                    ? `FREE PLAN - ${locationLimit} saved locations`
                    : "CHECKING PLAN"}
              </Text>
            </View>
          ) : null}
          <Text selectable style={{ color: status.includes("error") ? "#b42318" : "#5f6670", fontSize: 13 }}>
            {session
              ? profileLoading
                ? "Checking your account plan..."
                : planType
                  ? `${locationLimit} saved locations available.`
                  : "Plan not found. Check this user's profile in Supabase."
              : status}
          </Text>
        </View>

        {!session ? (
          <View style={{ gap: 12 }}>
            <Pressable
              onPress={handleGoogleSignIn}
              disabled={loading}
              style={({ pressed }) => [
                googleButton,
                (pressed || loading) && { opacity: 0.65, transform: [{ scale: 0.99 }] },
              ]}
            >
              <Text style={{ color: "#24282b", fontSize: 17, fontWeight: "900" }}>
                {loading ? "Opening Google..." : "Continue with Google"}
              </Text>
            </Pressable>
            <Text selectable style={{ color: "#5f6670", fontSize: 13, fontWeight: "800", textAlign: "center" }}>
              Email code is here only as a backup during beta.
            </Text>
            <Text selectable style={{ color: "#5f6670", fontSize: 11, textAlign: "center" }}>
              Google redirect URL: {googleRedirectTo}
            </Text>
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
              style={({ pressed }) => [
                primaryButton,
                (pressed || loading) && { opacity: 0.65, transform: [{ scale: 0.99 }] },
              ]}
            >
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>
                {loading ? "Sending..." : "Send Sign-In Code"}
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
              style={({ pressed }) => [
                outlineButton,
                (pressed || loading) && { opacity: 0.65, transform: [{ scale: 0.99 }] },
              ]}
            >
              <Text style={{ color: "#0b9db9", fontSize: 16, fontWeight: "900" }}>
                {loading ? "Checking..." : "Verify Code"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <View style={{ backgroundColor: "#f1f1f1", borderRadius: 8, padding: 16, gap: 10 }}>
              <Text selectable style={{ color: "#24282b", fontSize: 18, fontWeight: "900" }}>
                Save Locations
              </Text>
              <Text selectable style={{ color: "#5f6670", fontSize: 13 }}>
                {planType
                  ? `Your ${planLabel} plan saves up to ${locationLimit} destinations.`
                  : "Your plan is still loading."}
              </Text>
              <Text selectable style={{ color: "#5f6670", fontSize: 13 }}>
                Locations on this device: {state.destinations.length}
              </Text>
              <Pressable
                onPress={handleSaveGuestLocations}
                disabled={loading}
                style={({ pressed }) => [
                  primaryButton,
                  (pressed || loading) && { opacity: 0.65, transform: [{ scale: 0.99 }] },
                ]}
              >
                <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>
                  {loading ? "Saving..." : "Save My Locations"}
                </Text>
              </Pressable>
              {syncStatus ? (
                <Text selectable style={{ color: syncStatus.includes("failed") ? "#b42318" : "#5f6670", fontSize: 13 }}>
                  {syncStatus}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={handleSignOut}
              disabled={loading}
              style={({ pressed }) => [
                dangerButton,
                (pressed || loading) && { opacity: 0.65, transform: [{ scale: 0.99 }] },
              ]}
            >
              <Text style={{ color: "#b42318", fontSize: 16, fontWeight: "900" }}>
                {loading ? "Signing Out..." : "Sign Out"}
              </Text>
            </Pressable>
          </View>
        )}

        <Pressable
          onPress={() => router.replace("/")}
          style={({ pressed }) => [
            { ...primaryButton, paddingVertical: 16 },
            pressed && { opacity: 0.65, transform: [{ scale: 0.99 }] },
          ]}
        >
          <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "900" }}>Return to Main Screen</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function mapAccountDestination(destination: AccountDestinationRow): Destination {
  return {
    id: destination.source_local_id ?? destination.id,
    name: destination.name,
    address: destination.address,
    placeId: destination.place_id ?? undefined,
    latitude: destination.latitude ?? undefined,
    longitude: destination.longitude ?? undefined,
    nickname: destination.nickname,
    cardColor: destination.card_color ?? "#0b9db9",
    isPriority: destination.is_priority ?? false,
    status: "IDLE",
    trafficColor: "UNKNOWN",
    delayMinutes: null,
    etaMinutes: null,
    normalMinutes: null,
    alternateRouteExists: null,
    congestionSegments: [],
  };
}

async function ensureProfile(userId?: string, email?: string) {
  if (!userId) {
    return "Missing user id.";
  }

  const { data: existingProfile, error: readError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    return readError.message;
  }

  if (existingProfile) {
    return undefined;
  }

  const { error } = await supabase.from("profiles").insert({
    id: userId,
    email,
    plan_type: "FREE",
    location_limit: 2,
    is_admin: false,
  });

  return error?.message;
}
