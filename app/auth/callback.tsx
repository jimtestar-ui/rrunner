import { supabase } from "@/lib/supabase";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
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
      const initialUrl = await Linking.getInitialURL();
      const parsedParams = initialUrl ? QueryParams.getQueryParams(initialUrl).params : {};
      const error = readParam(parsedParams.error) ?? readParam(params.error);
      const code = readParam(parsedParams.code) ?? readParam(params.code);
      const accessToken = readParam(parsedParams.access_token) ?? readParam(params.access_token);
      const refreshToken = readParam(parsedParams.refresh_token) ?? readParam(params.refresh_token);

      if (error) {
        throw new Error(error);
      }

      let userId: string | undefined;
      let email: string | undefined;

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          throw error;
        }

        userId = data.session?.user.id;
        email = data.session?.user.email ?? undefined;
      } else if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
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

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
