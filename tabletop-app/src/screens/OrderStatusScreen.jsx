import React from 'react';
import { View, Text, Pressable, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BellRing, ChevronLeft } from 'lucide-react-native';
import { useOrderStore } from '../store/orderStore';
import { useTableStore } from '../store/tableStore';
import { money } from '../utils/format';
import { ORDER_STATUS } from '../constants/tokens';
import { colors } from '../constants/colors';

/**
 * OrderStatus — live tracking screen.
 * Persistent until order ends. Per-item station status is shown.
 *
 * Backend wiring TODO:
 *   - Subscribe to websocket order:status:updated and order:item:status
 *   - On status === 'delivered' → orderStore.closeOrder() and route to Home
 */

const STAGE_ORDER = [
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
];

const stageLabel = {
  [ORDER_STATUS.ACCEPTED]: 'Accepted',
  [ORDER_STATUS.PREPARING]: 'Preparing your order',
  [ORDER_STATUS.READY]: 'Ready for pickup',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
};

const stageColor = {
  [ORDER_STATUS.ACCEPTED]: colors.status.accepted,
  [ORDER_STATUS.PREPARING]: colors.status.preparing,
  [ORDER_STATUS.READY]: colors.status.ready,
};

const StageDot = ({ idx, current, total }) => {
  const isDone = idx < current;
  const isActive = idx === current;
  const stage = STAGE_ORDER[idx];
  const c = stageColor[stage];

  return (
    <View className="items-center flex-1">
      <View
        className="w-12 h-12 rounded-full items-center justify-center"
        style={{
          backgroundColor: isDone || isActive ? c : colors.card,
          borderWidth: isDone || isActive ? 0 : 2,
          borderColor: colors.ink[300],
        }}
      >
        <Text className="text-card text-base font-bold">
          {isDone ? '✓' : idx + 1}
        </Text>
      </View>
      <Text
        className="text-xs font-bold mt-2"
        style={{ color: isActive ? c : colors.ink[700] }}
      >
        {stage === ORDER_STATUS.ACCEPTED && 'Accepted'}
        {stage === ORDER_STATUS.PREPARING && 'Preparing'}
        {stage === ORDER_STATUS.READY && 'Ready'}
      </Text>
    </View>
  );
};

const OrderStatusScreen = ({ navigation }) => {
  const order = useOrderStore((s) => s.active);
  const updateStatus = useOrderStore((s) => s.updateStatus);
  const closeOrder = useOrderStore((s) => s.closeOrder);
  const tableNumber = useTableStore((s) => s.tableNumber);

  if (!order) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Text className="text-ink-700">No active order.</Text>
      </View>
    );
  }

  const currentIdx = STAGE_ORDER.indexOf(order.status);
  const safeIdx = currentIdx < 0 ? 0 : currentIdx;

  // DEV ONLY — tapping the headline cycles through stages so you can see all states.
  // TODO: remove when backend pushes real status changes.
  const cycle = () => {
    const next = STAGE_ORDER[(safeIdx + 1) % STAGE_ORDER.length];
    updateStatus(next);
  };

  return (
    <View className="flex-1 bg-surface">
      <StatusBar barStyle="dark-content" backgroundColor={colors.card} />

      {/* Header */}
      <SafeAreaView edges={['top']} className="bg-card border-b border-line">
        <View className="px-6 py-3 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <Pressable
              onPress={() => navigation.navigate('Home')}
              className="w-12 h-12 rounded-2xl bg-surface border border-line items-center justify-center"
              hitSlop={6}
            >
              <ChevronLeft size={22} color={colors.ink[900]} strokeWidth={2.2} />
            </Pressable>
            <View className="ml-3 flex-1">
              <Text className="text-ink-900 text-xl font-bold">Order {order.token}</Text>
              <Text className="text-ink-500 text-xs">
                Table {tableNumber} · Placed just now
              </Text>
            </View>
          </View>
          <View className="flex-row items-center bg-tint-accepted rounded-pill px-3 py-2">
            <View className="w-2 h-2 rounded-full bg-status-accepted mr-2" />
            <Text className="text-status-accepted text-xs font-bold tracking-wide">
              LIVE STATUS
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero progress card */}
        <Pressable onPress={cycle} className="bg-card border border-line rounded-3xl p-5 mb-4">
          <Text className="text-ink-500 text-xs font-bold tracking-widest">
            CURRENT STATUS
          </Text>
          <Text
            className="text-3xl font-bold mt-2"
            style={{ color: stageColor[order.status] || colors.ink[900] }}
          >
            {stageLabel[order.status]}
          </Text>
          <Text className="text-ink-700 text-xs mt-1">
            Tap to simulate next stage (DEV only)
          </Text>

          {/* Progress rail */}
          <View className="mt-5">
            <View className="h-1.5 bg-line rounded-full" />
            <View
              className="absolute top-0 left-0 h-1.5 rounded-full"
              style={{
                backgroundColor: stageColor[order.status] || colors.brand.primary,
                width: `${((safeIdx + 1) / STAGE_ORDER.length) * 100}%`,
              }}
            />
            <View className="flex-row mt-3">
              {STAGE_ORDER.map((_, i) => (
                <StageDot key={i} idx={i} current={safeIdx} total={STAGE_ORDER.length} />
              ))}
            </View>
          </View>
        </Pressable>

        {/* Items header */}
        <View className="flex-row justify-between items-baseline mb-2 px-1">
          <Text className="text-ink-900 text-sm font-bold">Items in your order</Text>
          <Text className="text-ink-500 text-xs">Tracked by station</Text>
        </View>

        {order.items.map((it, idx) => {
          const itemStage = STAGE_ORDER.indexOf(it.status);
          const tint =
            it.status === ORDER_STATUS.READY
              ? 'border-status-ready bg-tint-ready'
              : it.status === ORDER_STATUS.PREPARING
              ? 'border-status-preparing bg-tint-preparing'
              : 'border-status-accepted bg-tint-accepted';
          return (
            <View
              key={idx}
              className={`bg-card border border-line rounded-2xl p-3 mb-3 flex-row items-center`}
            >
              <View className="bg-brand-light w-14 h-14 rounded-xl items-center justify-center mr-3">
                <Text style={{ fontSize: 24 }}>🍔</Text>
              </View>
              <View className="flex-1">
                <Text className="text-ink-900 text-sm font-bold">
                  {it.quantity}× {it.name}
                </Text>
                <Text className="text-ink-500 text-[11px] mt-0.5">
                  {it.station === 'kitchen' ? 'Main Kitchen' : it.station} ·{' '}
                  {[it.variant, it.spice].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <View className={`rounded-pill px-3 py-1.5 ${tint}`}>
                <Text
                  className="text-xs font-bold"
                  style={{ color: stageColor[it.status] || colors.ink[700] }}
                >
                  {(it.status || '').toUpperCase()}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Need anything */}
        <View className="bg-card border border-line rounded-2xl p-4 mt-2 flex-row items-center">
          <BellRing size={28} color={colors.brand.primary} strokeWidth={2} />
          <View className="flex-1 ml-3">
            <Text className="text-ink-900 text-base font-bold">Need anything?</Text>
            <Text className="text-ink-500 text-xs mt-0.5">
              Ask for water, cutlery, condiments, or a server
            </Text>
          </View>
          <Pressable className="bg-brand h-10 px-4 rounded-2xl items-center justify-center">
            <Text className="text-card text-xs font-bold">Call a server</Text>
          </Pressable>
        </View>

        {/* Token strip */}
        <View className="bg-ink-900 rounded-2xl p-4 mt-3 flex-row items-center">
          <View className="flex-1">
            <Text className="text-ink-500 text-[10px] font-bold tracking-widest">
              TOKEN
            </Text>
            <Text className="text-card text-2xl font-bold" style={{ letterSpacing: 3 }}>
              {order.token}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-ink-500 text-[10px] font-bold tracking-widest">
              TABLE
            </Text>
            <Text className="text-card text-2xl font-bold" style={{ letterSpacing: 3 }}>
              {String(tableNumber).padStart(2, '0')}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-ink-500 text-[10px] font-bold tracking-widest">
              TOTAL
            </Text>
            <Text className="text-card text-2xl font-bold">
              {money(order.totals.total)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom */}
      <SafeAreaView edges={['bottom']} className="bg-card border-t border-line">
        <View className="flex-row gap-3 px-4 py-3">
          <Pressable
            onPress={() => navigation.navigate('Home')}
            className="flex-1 bg-card border-2 border-line h-14 rounded-2xl items-center justify-center"
            style={{ borderWidth: 1.5 }}
          >
            <Text className="text-ink-700 text-sm font-bold">Browse menu</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              closeOrder();
              navigation.navigate('Welcome');
            }}
            className="flex-1 bg-ink-900 h-14 rounded-2xl items-center justify-center"
          >
            <Text className="text-card text-sm font-bold">End session</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default OrderStatusScreen;
