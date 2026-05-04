import { Text, TextInput, View } from "react-native";

interface Props {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}

export function Field({ label, value, onChangeText, placeholder, multiline }: Props) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: "#24282b", fontSize: 15, fontWeight: "900", letterSpacing: 3 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        style={{
          backgroundColor: "#e8e8e8",
          borderRadius: 5,
          borderCurve: "continuous",
          color: "#24282b",
          fontSize: 19,
          minHeight: multiline ? 76 : 64,
          paddingHorizontal: 22,
          paddingVertical: 14,
          textAlignVertical: "center",
        }}
      />
    </View>
  );
}
