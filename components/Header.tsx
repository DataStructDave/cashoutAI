import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontSizes } from "../theme";

export const HEADER_HEIGHT = 56;

type HeaderProps = {
  title: string;
};

export default function Header({ title }: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top,
          height: HEADER_HEIGHT + insets.top,
        },
      ]}
    >
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: colors.primary,
  },
});
