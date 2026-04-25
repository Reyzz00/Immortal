import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckinScreen } from "@/screens/CheckinScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { ExperimentsScreen } from "@/screens/ExperimentsScreen";
import { PulseScreen } from "@/screens/PulseScreen";
import { palette, radii, shadow, spacing } from "@/theme";

const Tab = createBottomTabNavigator();

const ICONS: Record<string, string> = {
  Today: "◉",
  Pulse: "∿",
  "Check-in": "✎",
  Experiments: "△",
};

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={[styles.barWrap, { paddingBottom: Math.max(insets.bottom, spacing.m) }]}
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label =
            (options.tabBarLabel as string) ?? options.title ?? route.name;
          const glyph = ICONS[route.name] ?? "•";

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              (
                navigation as unknown as {
                  navigate: (n: string, p?: object) => void;
                }
              ).navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [
                styles.tab,
                focused && styles.tabActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.glyph, focused && styles.glyphActive]}>
                {glyph}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.label, focused && styles.labelActive]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function RootTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Today"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarShowLabel: false }}
    >
      <Tab.Screen
        name="Today"
        component={DashboardScreen}
        options={{ title: "Today" }}
      />
      <Tab.Screen
        name="Pulse"
        component={PulseScreen}
        options={{ title: "Pulse" }}
      />
      <Tab.Screen
        name="Check-in"
        component={CheckinScreen}
        options={{ title: "Check-in" }}
      />
      <Tab.Screen
        name="Experiments"
        component={ExperimentsScreen}
        options={{ title: "Labs" }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  barWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingTop: spacing.s,
    paddingHorizontal: spacing.m,
  },
  bar: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    backgroundColor: palette.ink,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    minWidth: 320,
    ...shadow.floating,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.pill,
    gap: 2,
  },
  tabActive: {
    backgroundColor: palette.accent,
  },
  glyph: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.surface,
    opacity: 0.78,
  },
  glyphActive: {
    color: palette.ink,
    opacity: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: palette.surface,
    opacity: 0.66,
    letterSpacing: 0.3,
  },
  labelActive: {
    color: palette.ink,
    opacity: 1,
  },
});
