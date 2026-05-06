import { supabase } from "@/lib/supabase";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; access_token?: string; refresh_token?: string; error?: string }>();
  const currentUrl = Linking.useURL();
  const [message, setMessage] = useState("Finishing Google sign-in...");
  const [debugMessage, setDebugMessage] = useState("");

  useEffect(() => {
    finishSignIn();
  }, [currentUrl]);

  async function finishSignIn() {
    try {
      const initialUrl = await Linking.getInitialURL();
      const initialParams = initialUrl ? QueryParams.getQueryParams(initialUrl).params : {};
      const currentParams = currentUrl ? QueryParams.getQueryParams(currentUrl).params : {};
      const error = readParam(currentParams.error) ?? readParam(initialParams.error) ?? readParam(params.error);
      const code = readParam(currentParams.code) ?? readParam(initialParams.code) ?? readParam(params.code);
      const accessToken =
        readParam(currentParams.access_token) ?? readParam(initialParams.access_token) ?? readParam(params.access_token);
      const refreshToken =
        readParam(currentParams.refresh_token) ??
        readParam(initialParams.refresh_token) ??
        readParam(params.refresh_token);

      setDebugMessage(
        [
          `Callback URL: ${summarizeUrl(currentUrl ?? initialUrl)}`,
          `Has code: ${code ? "yes" : "no"}`,
          `Has token: ${accessToken && refreshToken ? "yes" : "no"}`,
        ].join("\n"),
      );

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
      {debugMessage ? (
        <Text selectable style={{ color: "#5f6670", fontSize: 13, marginTop: 18, textAlign: "center" }}>
          {debugMessage}
        </Text>
      ) : null}
    </View>
  );
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function summarizeUrl(url: string | null) {
  if (!url) {
    return "none";
  }

  return url.replace(/(code|access_token|refresh_token)=([^&#]+)/g, "$1=present");
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
