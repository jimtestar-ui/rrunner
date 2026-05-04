import { CARD_COLORS } from "@/lib/app-store";
import { Pressable, Text, View } from "react-native";

interface Props {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

export function ColorPicker({ selectedColor, onSelectColor }: Props) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: "#24282b", fontSize: 15, fontWeight: "900", letterSpacing: 3 }}>CARD COLOR</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {CARD_COLORS.map((color) => {
          const selected = selectedColor === color;

          return (
            <Pressable
              key={color}
              onPress={() => onSelectColor(color)}
              style={{
                alignItems: "center",
                borderColor: selected ? "#24282b" : "#ffffff",
                borderRadius: 18,
                borderWidth: 3,
                height: 42,
                justifyContent: "center",
                width: 42,
              }}
            >
              <View
                style={{
                  backgroundColor: color,
                  borderColor: "#ffffff",
                  borderRadius: 14,
                  borderWidth: 2,
                  height: 30,
                  width: 30,
                }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
