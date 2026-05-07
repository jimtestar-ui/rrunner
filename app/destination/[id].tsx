import { BrandHeader } from "@/components/brand-header";
import { ColorPicker } from "@/components/color-picker";
import { Field } from "@/components/field";
import { PlaceSearch } from "@/components/place-search";
import { PriorityToggle } from "@/components/priority-toggle";
import {
  deleteAccountDestination,
  loadSavedAccountDestinations,
  mergeSavedDestinationsWithTraffic,
  saveAccountDestination,
} from "@/lib/account-destinations";
import { CARD_COLORS, useAppStore } from "@/lib/app-store";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

export default function EditDestinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateDestination, deleteDestination, replaceDestinations } = useAppStore();
  const destination = useMemo(
    () => state.destinations.find((item) => item.id === id),
    [id, state.destinations],
  );
  const [name, setName] = useState(destination?.name ?? "");
  const [address, setAddress] = useState(destination?.address ?? "");
  const [nickname, setNickname] = useState(destination?.nickname ?? "");
  const [cardColor, setCardColor] = useState(destination?.cardColor ?? CARD_COLORS[0]);
  const [isPriority, setIsPriority] = useState(destination?.isPriority ?? false);
  const [placeId, setPlaceId] = useState<string | undefined>(destination?.placeId);
  const [latitude, setLatitude] = useState<number | undefined>(destination?.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(destination?.longitude);
  const [saving, setSaving] = useState(false);

  async function handleSaveAndReturn() {
    if (!destination) {
      router.replace("/");
      return;
    }

    const nextDestination = {
      ...destination,
      name: name.trim() || "Destination Name",
      address: address.trim(),
      placeId,
      latitude,
      longitude,
      nickname: nickname.trim() || name.trim() || "Saved Stop",
      cardColor,
      isPriority,
    };

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (userId) {
      setSaving(true);
      const { error } = await saveAccountDestination(userId, nextDestination);
      const { destinations, error: loadError } = error
        ? { destinations: [], error: null }
        : await loadSavedAccountDestinations(userId);
      setSaving(false);

      if (error || loadError) {
        Alert.alert("Save Failed", error?.message ?? loadError?.message ?? "Could not save this location.");
        return;
      }

      replaceDestinations(mergeSavedDestinationsWithTraffic(destinations, state.destinations), userId);
      router.replace("/");
      return;
    }

    updateDestination(destination.id, nextDestination);
    router.replace("/");
  }

  function handleDelete() {
    if (!destination) {
      router.replace("/");
      return;
    }

    Alert.alert("Delete Location?", `Remove ${destination.nickname} from your saved locations?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = sessionData.session?.user.id;

          if (userId) {
            const { error } = await deleteAccountDestination(userId, destination);
            const { destinations, error: loadError } = error
              ? { destinations: [], error: null }
              : await loadSavedAccountDestinations(userId);

            if (error || loadError) {
              Alert.alert("Delete Failed", error?.message ?? loadError?.message ?? "Could not delete this location.");
              return;
            }

            replaceDestinations(mergeSavedDestinationsWithTraffic(destinations, state.destinations), userId);
            router.replace("/");
            return;
          }

          deleteDestination(destination.id);
          router.replace("/");
        },
      },
    ]);
  }

  if (!destination) {
    return (
      <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <BrandHeader />
        <View style={{ padding: 24, gap: 18 }}>
          <Text selectable style={{ color: "#24282b", fontSize: 24, fontWeight: "900" }}>
            Location not found
          </Text>
          <Pressable onPress={() => router.replace("/")} style={{ backgroundColor: "#0b9db9", borderRadius: 8, paddingVertical: 16, alignItems: "center" }}>
            <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "900" }}>Return to Main Screen</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <BrandHeader />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 34, gap: 18 }}>
        <Text selectable style={{ color: "#24282b", fontSize: 34, fontWeight: "900", textAlign: "center" }}>
          Edit Location
        </Text>
        <Text selectable style={{ color: "#5f6670", fontSize: 15, textAlign: "center" }}>
          Keep your frequent work zones easy to recognize.
        </Text>
        <PlaceSearch
          value={name}
          onChangeText={setName}
          onSelectPlace={(place) => {
            setName(place.name);
            setAddress(place.address);
            setNickname(place.name);
            setPlaceId(place.placeId);
            setLatitude(place.latitude);
            setLongitude(place.longitude);
          }}
        />
        <Field label="LOCATION NAME" value={name} onChangeText={setName} />
        <Field label="ADDRESS" value={address} onChangeText={setAddress} multiline />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {placeId ? <Ionicons name="checkmark-circle" color="#087f5b" size={18} /> : null}
          <Text selectable style={{ flex: 1, color: placeId ? "#087f5b" : "#b54708", fontSize: 13, fontWeight: "800" }}>
            {placeId ? "Google place selected. Real traffic checks can use this location." : "Search and select a Google place for real traffic checks."}
          </Text>
        </View>
        <Field label="DISPLAY NAME" value={nickname} onChangeText={setNickname} />
        <ColorPicker selectedColor={cardColor} onSelectColor={setCardColor} />
        <PriorityToggle value={isPriority} onValueChange={setIsPriority} />
        <Pressable
          onPress={handleSaveAndReturn}
          disabled={saving}
          style={{
            alignItems: "center",
            backgroundColor: saving ? "#9aa3aa" : "#0b9db9",
            borderRadius: 8,
            borderCurve: "continuous",
            marginTop: 12,
            paddingVertical: 18,
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "900" }}>
            {saving ? "Saving..." : "Save & Return to Main Screen"}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleDelete}
          style={{
            alignItems: "center",
            borderColor: "#b42318",
            borderRadius: 8,
            borderWidth: 2,
            paddingVertical: 16,
          }}
        >
          <Text style={{ color: "#b42318", fontSize: 17, fontWeight: "900" }}>
            Delete Location
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
