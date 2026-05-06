import { BrandHeader } from "@/components/brand-header";
import { ColorPicker } from "@/components/color-picker";
import { Field } from "@/components/field";
import { PlaceSearch } from "@/components/place-search";
import { PriorityToggle } from "@/components/priority-toggle";
import {
  getAccountLocationLimit,
  getSavedAccountDestinationCount,
  loadSavedAccountDestinations,
  saveAccountDestination,
} from "@/lib/account-destinations";
import { CARD_COLORS, useAppStore } from "@/lib/app-store";
import { canAddDestination } from "@/lib/plan";
import { supabase } from "@/lib/supabase";
import { Destination } from "@/types/traffic";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

export default function AddDestinationScreen() {
  const { state, addDestination, replaceDestinations } = useAppStore();
  const [destination, setDestination] = useState("Da Square");
  const [address, setAddress] = useState("232323 Apple Cherry Square,\nDetroit, MI, 48205");
  const [customName, setCustomName] = useState("Da Square");
  const [cardColor, setCardColor] = useState(CARD_COLORS[state.destinations.length % CARD_COLORS.length]);
  const [isPriority, setIsPriority] = useState(false);
  const [placeId, setPlaceId] = useState<string | undefined>();
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const plan = state.plan;
  const currentCount = state.destinations.length;
  const limitReached = !signedIn && !canAddDestination(currentCount, plan);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session?.user.id)));
  }, []);

  async function handleAddDestination() {
    const destinationInput = {
      name: destination.trim() || "Destination Name",
      address: address.trim(),
      placeId,
      latitude,
      longitude,
      nickname: customName.trim() || destination.trim() || "Saved Stop",
      cardColor,
      isPriority,
    };

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (userId) {
      setSaving(true);
      const { locationLimit, error: limitError } = await getAccountLocationLimit(userId);
      const { count, error: countError } = await getSavedAccountDestinationCount(userId);

      if (limitError || countError) {
        setSaving(false);
        Alert.alert("Save Failed", limitError?.message ?? countError?.message ?? "Could not check your account plan.");
        return;
      }

      if (count >= locationLimit) {
        setSaving(false);
        Alert.alert("Upgrade Needed", `Your account allows ${locationLimit} saved locations.`);
        return;
      }

      const nextDestination = createDestination(destinationInput);
      const { error } = await saveAccountDestination(userId, nextDestination);
      const { destinations, error: loadError } = error
        ? { destinations: [], error: null }
        : await loadSavedAccountDestinations(userId);
      setSaving(false);

      if (error || loadError) {
        Alert.alert("Save Failed", error?.message ?? loadError?.message ?? "Could not save this location.");
        return;
      }

      replaceDestinations(destinations, userId);
      router.replace("/");
      return;
    }

    const didAdd = addDestination(destinationInput);

    if (!didAdd) {
      Alert.alert("Upgrade Needed", `Your ${plan.type.toLowerCase()} plan allows ${plan.locationLimit} saved locations.`);
      return;
    }

    router.replace("/");
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <BrandHeader />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 34, gap: 18 }}>
        <Text selectable style={{ color: "#24282b", fontSize: 37, fontWeight: "900", lineHeight: 38, textAlign: "center" }}>
          Add Location
        </Text>
        <Text selectable style={{ color: "#24282b", fontSize: 17, textAlign: "center", marginBottom: 18 }}>
          Save a place you check before accepting rides, orders, or deliveries.
        </Text>

        <PlaceSearch
          value={destination}
          onChangeText={setDestination}
          onSelectPlace={(place) => {
            setDestination(place.name);
            setAddress(place.address);
            setCustomName(place.name);
            setPlaceId(place.placeId);
            setLatitude(place.latitude);
            setLongitude(place.longitude);
          }}
        />
        <Field label="LOCATION NAME" value={destination} onChangeText={setDestination} />
        <Field label="ADDRESS" value={address} onChangeText={setAddress} multiline />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {placeId ? <Ionicons name="checkmark-circle" color="#087f5b" size={18} /> : null}
          <Text selectable style={{ flex: 1, color: placeId ? "#087f5b" : "#b54708", fontSize: 13, fontWeight: "800" }}>
            {placeId ? "Google place selected. Real traffic checks can use this location." : "Search and select a Google place for real traffic checks."}
          </Text>
        </View>
        <Field label="DISPLAY NAME" value={customName} onChangeText={setCustomName} />
        <ColorPicker selectedColor={cardColor} onSelectColor={setCardColor} />
        <PriorityToggle value={isPriority} onValueChange={setIsPriority} />

        <Pressable
          onPress={handleAddDestination}
          disabled={limitReached || saving}
          style={{
            alignItems: "center",
            backgroundColor: limitReached || saving ? "#9aa3aa" : "#0b9db9",
            borderRadius: 8,
            borderCurve: "continuous",
            marginTop: 12,
            paddingVertical: 18,
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 19, fontWeight: "900" }}>
            {saving ? "Saving..." : limitReached ? "Free Plan Limit Reached" : "Save Location"}
          </Text>
        </Pressable>

        <View style={{ gap: 10 }}>
          <Text selectable style={{ color: "#24282b", fontSize: 16, fontWeight: "900", letterSpacing: 3 }}>
            UPGRADE TO PRO FOR MORE LOCATIONS
          </Text>
          <Link href="/settings" asChild>
            <Pressable
              style={{
                alignSelf: "center",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#b8b8b8",
                borderRadius: 12,
                borderCurve: "continuous",
                height: 70,
                width: 78,
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 28, fontWeight: "900" }}>PRO</Text>
              <Ionicons name="chevron-forward" color="#ffffff" size={15} style={{ position: "absolute", right: 6 }} />
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}

function createDestination(
  input: Pick<
    Destination,
    "name" | "address" | "nickname" | "cardColor" | "isPriority" | "placeId" | "latitude" | "longitude"
  >,
): Destination {
  return {
    id: `${input.nickname.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
    name: input.name,
    address: input.address,
    placeId: input.placeId,
    latitude: input.latitude,
    longitude: input.longitude,
    nickname: input.nickname,
    cardColor: input.cardColor,
    isPriority: input.isPriority,
    status: "IDLE",
    trafficColor: "UNKNOWN",
    delayMinutes: null,
    etaMinutes: null,
    normalMinutes: null,
    alternateRouteExists: null,
    congestionSegments: [],
  };
}
