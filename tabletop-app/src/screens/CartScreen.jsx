import React from 'react';
import { View, Text, ScrollView, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ArrowRight, Tag } from 'lucide-react-native';
import Header from '../components/Header';
import QuantityStepper from '../components/QuantityStepper';
import TipSelector from '../components/TipSelector';
import { useCartStore, lineSubtotal } from '../store/cartStore';
import { money } from '../utils/format';
import { colors } from '../constants/colors';

/**
 * Cart — review items, apply promo, choose tip, then checkout.
 *
 * Routes:
 *   tap "Continue to payment" → Payment
 */

const CartRow = ({ line }) => {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeLine = useCartStore((s) => s.removeLine);

  const total = lineSubtotal(line);
  const modBits = [];
  if (line.variant) modBits.push(line.variant.name);
  if (line.spice) modBits.push(line.spice.name);
  const modsLine = modBits.join(' · ');
  const extrasLine = (line.extras || []).map((e) => `+ ${e.name}`).join(' · ');
  const removedLine = (line.removed || []).map((r) => `no ${r.name}`).join(' · ');

  return (
    <View className="bg-card border border-line rounded-2xl p-3 mb-3 flex-row">
      <View className={`bg-${'brand-light'} w-24 h-24 rounded-xl items-center justify-center mr-3`}>
        <Text style={{ fontSize: 44 }}>{line.image}</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-2">
            <Text className="text-ink-900 text-base font-bold">{line.name}</Text>
            {modsLine ? (
              <Text className="text-ink-500 text-xs mt-1">{modsLine}</Text>
            ) : null}
            {extrasLine ? (
              <Text className="text-ink-500 text-xs mt-0.5">{extrasLine}</Text>
            ) : null}
            {removedLine ? (
              <Text className="text-ink-500 text-xs mt-0.5">{removedLine}</Text>
            ) : null}
          </View>
          <Pressable onPress={() => removeLine(line.lineId)} hitSlop={10}>
            <X size={18} color={colors.ink[300]} strokeWidth={1.8} />
          </Pressable>
        </View>
        <View className="flex-row justify-between items-center mt-3">
          <QuantityStepper
            value={line.quantity}
            onChange={(q) => updateQuantity(line.lineId, q)}
            size="sm"
          />
          <Text className="text-ink-900 text-base font-bold">{money(total)}</Text>
        </View>
      </View>
    </View>
  );
};

const SummaryRow = ({ label, value, strong, accent }) => (
  <View className="flex-row justify-between items-center py-1">
    <Text
      className={`${
        strong ? 'text-ink-900 text-base font-bold' : 'text-ink-700 text-sm'
      }`}
    >
      {label}
    </Text>
    <Text
      className={`${
        strong
          ? `${accent ? 'text-brand' : 'text-ink-900'} text-xl font-bold`
          : 'text-ink-900 text-sm font-semibold'
      }`}
    >
      {value}
    </Text>
  </View>
);

const CartScreen = ({ navigation }) => {
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore((s) => s.subtotal());
  const tax = useCartStore((s) => s.tax());
  const tip = useCartStore((s) => s.tip());
  const total = useCartStore((s) => s.total());
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <View className="flex-1 bg-surface">
      <StatusBar barStyle="dark-content" backgroundColor={colors.card} />
      <SafeAreaView edges={['top']} className="bg-card">
        <Header
          back
          title="Your Order"
          subtitle={`${itemCount} item${itemCount === 1 ? '' : 's'}`}
          showCart={false}
        />
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        {lines.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-ink-500 text-base">Your cart is empty.</Text>
            <Pressable
              onPress={() => navigation.goBack()}
              className="mt-4 bg-brand px-6 h-12 rounded-2xl items-center justify-center"
            >
              <Text className="text-card text-sm font-bold">Browse menu</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {lines.map((line) => (
              <CartRow key={line.lineId} line={line} />
            ))}

            {/* Add more */}
            <Pressable
              onPress={() => navigation.goBack()}
              className="border-2 border-line rounded-2xl py-3 items-center mb-4"
              style={{ borderStyle: 'dashed' }}
            >
              <Text className="text-brand text-sm font-bold">+ Add more items</Text>
            </Pressable>

            {/* Promo */}
            <View className="flex-row gap-2 mb-5">
              <View className="flex-1 bg-card border border-line rounded-2xl h-12 px-4 flex-row items-center">
                <Tag size={16} color={colors.ink[500]} strokeWidth={1.8} />
                <Text className="text-ink-500 text-sm ml-2">Add promo code</Text>
              </View>
              <Pressable className="bg-surface border border-line rounded-2xl h-12 px-6 items-center justify-center">
                <Text className="text-ink-900 text-sm font-bold">Apply</Text>
              </Pressable>
            </View>

            {/* Tip */}
            <View className="mb-5">
              <TipSelector />
            </View>

            {/* Summary */}
            <View className="bg-card border border-line rounded-2xl p-4">
              <Text className="text-ink-900 text-sm font-bold mb-2">Order Summary</Text>
              <View className="h-px bg-line-subtle mb-2" />
              <SummaryRow label={`Subtotal (${itemCount} items)`} value={money(subtotal)} />
              <SummaryRow label="Tax (8%)" value={money(tax)} />
              <SummaryRow label="Tip" value={money(tip)} />
              <View className="h-px bg-line-subtle my-2" />
              <SummaryRow label="Total" value={money(total)} strong accent />
            </View>
          </>
        )}
      </ScrollView>

      {/* Sticky checkout bar */}
      {lines.length > 0 && (
        <View className="bg-card border-t border-line px-4 py-3">
          <SafeAreaView edges={['bottom']}>
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="text-ink-500 text-xs">
                  Total · {itemCount} items
                </Text>
                <Text className="text-ink-900 text-2xl font-bold">
                  {money(total)}
                </Text>
              </View>
              <Pressable
                onPress={() => navigation.navigate('Payment')}
                className="bg-brand h-16 px-5 rounded-2xl flex-row items-center"
              >
                <Text className="text-card text-base font-bold mr-2">
                  Continue to payment
                </Text>
                <ArrowRight size={20} color={colors.card} strokeWidth={2.4} />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
};

export default CartScreen;
