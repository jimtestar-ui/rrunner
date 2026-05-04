import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppStoreProvider } from "@/lib/app-store";

export default function Layout() {
  return (
    <AppStoreProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#f7f7f4" },
        }}
      />
    </AppStoreProvider>
  );
}
