import { Switch, Text, View } from "react-native";

interface Props {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function PriorityToggle({ value, onValueChange }: Props) {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "#f1f1f1",
        borderRadius: 8,
        borderCurve: "continuous",
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text selectable style={{ color: "#24282b", fontSize: 16, fontWeight: "900" }}>
          Priority location
        </Text>
        <Text selectable style={{ color: "#5f6670", fontSize: 13 }}>
          Keep your best earning zones near the top.
        </Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}
