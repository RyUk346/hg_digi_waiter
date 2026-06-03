import React from 'react';
import { View, Text, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, BellRing } from 'lucide-react-native';
import { useTableStore } from '../store/tableStore';
import { colors } from '../constants/colors';

/**
 * Welcome — the idle "tap to order" screen. Shown when the device is
 * unattended at a table.
 *
 * Routes:
 *   tap CTA → Home
 */

const WelcomeScreen = ({ navigation }) => {
  const tableNumber = useTableStore((s) => s.tableNumber);
  const cafeName = useTableStore((s) => s.cafeName);

  return (
    <View className="flex-1 bg-surface">
      <StatusBar barStyle="dark-content" backgroundColor={colors.brand.light} />

      {/* Top wash */}
      <View
        className="absolute top-0 left-0 right-0 bg-brand-light"
        style={{ height: '45%', borderBottomLeftRadius: 200, borderBottomRightRadius: 200 }}
      />

      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        {/* Status bar text */}
        <View className="flex-row justify-between px-8 pt-3">
          <Text className="text-ink-700 text-xs font-semibold">19:42</Text>
          <Text className="text-ink-700 text-xs">Wi-Fi · HG-Guest  ⌁ 96%</Text>
        </View>

        {/* Brand mark */}
        <View className="items-center mt-12">
          <View
            className="w-40 h-40 rounded-full bg-card items-center justify-center"
            style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 6 }}
          >
            <View className="w-28 h-28 rounded-full bg-brand items-center justify-center">
              <Text style={{ fontSize: 56 }}>☕</Text>
            </View>
          </View>
          <Text className="text-ink-900 text-2xl font-bold mt-6">{cafeName}</Text>
          <Text className="text-ink-500 text-sm mt-1">Order from your table</Text>
        </View>

        {/* Greeting */}
        <View className="items-center mt-16 px-8">
          <Text className="text-ink-500 text-xs font-bold tracking-[3px]">
            GOOD EVENING
          </Text>
          <Text className="text-ink-900 text-5xl font-bold mt-3">Welcome.</Text>
          <Text className="text-ink-700 text-base text-center mt-3">
            Browse our menu and order in seconds.
          </Text>
        </View>

        {/* Spacer */}
        <View className="flex-1" />

        {/* Table chip */}
        <View className="items-center mb-6">
          <View className="flex-row items-center bg-card border border-line rounded-pill px-5 py-3">
            <View className="w-2 h-2 rounded-full bg-status-ready mr-2" />
            <Text className="text-ink-900 text-base font-semibold">
              You're at Table {tableNumber}
            </Text>
          </View>
        </View>

        {/* Primary CTA */}
        <View className="px-6">
          <Pressable
            onPress={() => navigation.navigate('Home')}
            className="bg-brand h-20 rounded-3xl flex-row items-center justify-between px-7"
            style={{ shadowColor: colors.brand.primary, shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 }}
          >
            <Text className="text-card text-xl font-bold flex-1 text-right mr-3">
              Tap to start your order
            </Text>
            <ArrowRight size={28} color={colors.card} strokeWidth={2.4} />
          </Pressable>
        </View>

        {/* Secondary CTA */}
        <View className="px-6 mt-3">
          <Pressable
            onPress={() => {
              /* TODO: call-server hook (websocket -> kitchen "call_server") */
            }}
            className="bg-card border-2 border-line h-16 rounded-3xl flex-row items-center px-6"
          >
            <BellRing size={20} color={colors.ink[700]} strokeWidth={2} />
            <Text className="text-ink-900 text-base font-semibold ml-3 flex-1">
              Call a server
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View className="items-center py-6">
          <Text className="text-ink-500 text-xs">EN  ·  ES  ·  BN  ·  FR  ·  AR</Text>
          <Text className="text-ink-300 text-[11px] mt-1">
            {cafeName} · Powered by Digital Waiter
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default WelcomeScreen;
