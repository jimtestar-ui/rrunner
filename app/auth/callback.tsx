import { supabase } from "@/lib/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; access_token?: string; refresh_token?: string; error?: string }>();
  const [message, setMessage] = useState("Finishing Google sign-in...");

  useEffect(() => {
    finishSignIn();
  }, []);

  async function finishSignIn() {
    try {
      if (params.error) {
        throw new Error(String(params.error));
      }

      let userId: string | undefined;
      let email: string | undefined;

      if (params.code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(String(params.code));

        if (error) {
          throw error;
        }

        userId = data.session?.user.id;
        email = data.session?.user.email ?? undefined;
      } else if (params.access_token && params.refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token: String(params.access_token),
          refresh_token: String(params.refresh_token),
        });

        if (error) {
          throw error;
        }

        userId = data.session?.user.id;
        email = data.session?.user.email ?? undefined;
      }

      if (!userId) {
        throw new Error("Google sign-in did not return an account.");
      }

      const profileError = await ensureProfile(userId, email);

      if (profileError) {
        setMessage(`Signed in, but profile setup failed: ${profileError}`);
      } else {
        setMessage("Signed in with Google.");
      }

      setTimeout(() => router.replace("/account"), 500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google sign-in failed.");
    }
  }

  return (
    <View style={{ alignItems: "center", backgroundColor: "#ffffff", flex: 1, justifyContent: "center", padding: 24 }}>
      <Text selectable style={{ color: "#24282b", fontSize: 24, fontWeight: "900", textAlign: "center" }}>
        {message}
      </Text>
    </View>
  );
}

async function ensureProfile(userId: string, email?: string) {
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
