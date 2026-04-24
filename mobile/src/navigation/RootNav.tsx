import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text, View } from "react-native";

import { CheckinScreen } from "@/screens/CheckinScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { ExperimentsScreen } from "@/screens/ExperimentsScreen";
import { InsightsScreen } from "@/screens/InsightsScreen";
import { TrendsScreen } from "@/screens/TrendsScreen";
import { palette, radii, spacing } from "@/theme";

const Tab = createBottomTabNavigator();

function tabIcon(glyph: string) {
  return ({ focused }: { focused: boolean }) => (
    <View style={[tabStyles.icon, focused && tabStyles.iconActive]}>
      <Text style={[tabStyles.iconGlyph, focused && tabStyles.iconGlyphActive]}>{glyph}</Text>
    </View>
  );
}

export function RootTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Check-in"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: palette.text,
        tabBarInactiveTintColor: palette.textSoft,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopWidth: 0,
          height: 88,
          paddingTop: 10,
          paddingBottom: 22,
          paddingHorizontal: spacing.s,
          shadowColor: "#2A1D0C",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tab.Screen
        name="Today"
        component={DashboardScreen}
        options={{ tabBarIcon: tabIcon("◉"), title: "Today" }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{ tabBarIcon: tabIcon("✦"), title: "Insights" }}
      />
      <Tab.Screen
        name="Check-in"
        component={CheckinScreen}
        options={{ tabBarIcon: tabIcon("✎"), title: "Check-in" }}
      />
      <Tab.Screen
        name="Trends"
        component={TrendsScreen}
        options={{ tabBarIcon: tabIcon("∿"), title: "Trends" }}
      />
      <Tab.Screen
        name="Experiments"
        component={ExperimentsScreen}
        options={{ tabBarIcon: tabIcon("△"), title: "Labs" }}
      />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  icon: {
    width: 42,
    height: 30,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  iconActive: {
    backgroundColor: palette.ink,
  },
  iconGlyph: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.textSoft,
  },
  iconGlyphActive: {
    color: palette.accent,
  },
});
