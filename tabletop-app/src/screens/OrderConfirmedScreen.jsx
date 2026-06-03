import React from 'react';
import { View, Text, Pressable, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ArrowRight, Clock, User } from 'lucide-react-native';
import StatusPill from '../components/StatusPill';
import { useOrderStore } from '../store/orderStore';
import { useTableStore } from '../store/tableStore';
import { money } from '../utils/format';
import { colors } from '../constants/colors';

/**
 * OrderConfirmed — token screen shown immediately after payment.
 * From here the customer can:
 *   - Track live status (→ OrderStatus)
 *   - Order more items (→ Home, keeps active order alive)
 *
 * The active order in orderStore stays "alive" so the persistent
 * order summary button can stay visible on Home etc.
 */

const OrderConfirmedScreen = ({ navigation }) => {
  const order = useOrderStore((s) => s.active);
  const tableNumber = useTableStore((s) => s.tableNumber);

  if (!order) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Text className="text-ink-700">No active order.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <StatusBar barStyle="dark-content" backgroundColor="#E8F3EE" />

      {/* Top decorative wash */}
      <View
        className="absolute top-0 left-0 right-0"
        style={{
          height: '35%',
          backgroundColor: '#E8F3EE',
          borderBottomLeftRadius: 200,
          borderBottomRightRadius: 200,
          opacity: 0.55,
        }}
      />

      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Success mark */}
          <View className="items-center mt-10">
            <View
              className="w-24 h-24 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(45,138,102,0.18)' }}
            >
              <View className="w-16 h-16 rounded-full bg-status-ready items-center justify-center">
                <Check size={32} color={colors.card} strokeWidth={3} />
              </View>
            </View>
          </View>

          <Text className="text-ink-900 text-3xl font-bold text-center mt-6">
            Order confirmed!
          </Text>
          <Text className="text-ink-700 text-sm text-center mt-1">
            Paid · {money(order.totals.total)} · just now
          </Text>

          {/* Token card */}
          <View className="mx-5 mt-7 bg-card border border-line rounded-3xl py-6 px-6">
            <Text className="text-ink-500 text-xs font-bold tracking-[3px] text-center">
              YOUR ORDER TOKEN
            </Text>
            <View className="h-px my-3 bg-line" />
            <Text
              className="text-ink-900 font-bold text-center"
              style={{ fontSize: 72, letterSpacing: 6 }}
            >
              {order.token}
            </Text>
            <Text className="text-ink-500 text-xs text-center mt-2">
              Keep this device active to track your order
            </Text>
          </View>

          {/* Status pills */}
          <View className="px-5 mt-6">
            <View className="flex-row justify-between items-baseline mb-2">
              <Text className="text-ink-900 text-sm font-bold">Order status</Text>
              <Text className="text-ink-500 text-xs">Updates live</Text>
            </View>
            <View className="flex-row -mx-1">
              <StatusPill stage="accepted" state="active" />
              <StatusPill stage="preparing" state="pending" />
              <StatusPill stage="ready" state="pending" />
            </View>
          </View>

          {/* ETA + Server */}
          <View className="flex-row gap-3 px-5 mt-4">
            <View className="flex-1 bg-card border border-line rounded-2xl p-4 flex-row items-center">
              <Clock size={26} color={colors.brand.primary} strokeWidth={2} />
              <View className="ml-3">
                <Text className="text-ink-500 text-xs">Estimated time</Text>
                <Text className="text-ink-900 text-lg font-bold">~{order.eta} minutes</Text>
              </View>
            </View>
            <View className="flex-1 bg-card border border-line rounded-2xl p-4 flex-row items-center">
              <User size={26} color={colors.status.ready} strokeWidth={2} />
              <View className="ml-3 flex-1">
                <Text className="text-ink-500 text-xs">Server</Text>
                <Text className="text-ink-900 text-base font-bold" numberOfLines={1}>
                  Brought to Table {tableNumber}
                </Text>
              </View>
            </View>
          </View>

          {/* Mini summary */}
          <View className="mx-5 mt-4 bg-card border border-line rounded-2xl p-4">
            <Text className="text-ink-900 text-sm font-bold">
              Summary · {order.items.reduce((c, i) => c + i.quantity, 0)} items
            </Text>
            <View className="h-px bg-line-subtle my-2" />
            {order.items.map((it, i) => (
              <View key={i} className="flex-row justify-between py-1">
                <Text className="text-ink-900 text-sm flex-1 pr-2" numberOfLines={1}>
                  {it.quantity}× {it.name}
                </Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View className="px-5 mt-6">
            <Pressable
              onPress={() => navigation.replace('OrderStatus')}
              className="bg-brand h-16 rounded-2xl flex-row items-center justify-center px-5"
            >
              <Text className="text-card text-base font-bold mr-2">Track live order</Text>
              <ArrowRight size={20} color={colors.card} strokeWidth={2.4} />
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('Home')}
              className="bg-card border-2 border-line h-14 rounded-2xl items-center justify-center mt-3"
              style={{ borderWidth: 1.5 }}
            >
              <Text className="text-ink-700 text-sm font-bold">Order more items</Text>
            </Pressable>
          </View>

          <Text className="text-ink-500 text-xs text-center mt-6">
            A receipt has been queued for printing
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default OrderConfirmedScreen;
