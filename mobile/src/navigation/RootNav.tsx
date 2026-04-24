import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckinScreen } from "@/screens/CheckinScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { ExperimentsScreen } from "@/screens/ExperimentsScreen";
import { InsightsScreen } from "@/screens/InsightsScreen";
import { TrendsScreen } from "@/screens/TrendsScreen";
import { palette, shadow, spacing } from "@/theme";

const Tab = createBottomTabNavigator();

const ICONS: Record<string, string> = {
  Today: "◉",
  Insights: "✦",
  "Check-in": "✎",
  Trends: "∿",
  Experiments: "△",
};

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={[styles.barWrap, { paddingBottom: Math.max(insets.bottom, spacing.l) }]}
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = (options.tabBarLabel as string) ?? options.title ?? route.name;
          const glyph = ICONS[route.name] ?? "•";

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as never, route.params as never);
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
                styles.pill,
                focused && styles.pillActive,
                pressed && { transform: [{ scale: 0.94 }] },
              ]}
            >
              <Text style={[styles.glyph, focused && styles.glyphActive]}>{glyph}</Text>
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
      initialRouteName="Check-in"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarShowLabel: false }}
    >
      <Tab.Screen
        name="Today"
        component={DashboardScreen}
        options={{ title: "Today" }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{ title: "Insights" }}
      />
      <Tab.Screen
        name="Check-in"
        component={CheckinScreen}
        options={{ title: "Check-in" }}
      />
      <Tab.Screen
        name="Trends"
        component={TrendsScreen}
        options={{ title: "Trends" }}
      />
      <Tab.Screen
        name="Experiments"
        component={ExperimentsScreen}
        options={{ title: "Labs" }}
      />
    </Tab.Navigator>
  );
}

const PILL_SIZE = 44;

const styles = StyleSheet.create({
  barWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingTop: spacing.s,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.s,
    paddingHorizontal: spacing.s,
  },
  pill: {
    width: PILL_SIZE,
    height: PILL_SIZE,
    borderRadius: PILL_SIZE / 2,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  pillActive: {
    backgroundColor: palette.accent,
    ...shadow.floating,
  },
  glyph: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.textMuted,
  },
  glyphActive: {
    color: palette.ink,
  },
});
