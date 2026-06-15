import React, { useState } from 'react';
import { View, Text, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CreditCard, Banknote, Wifi, Shield } from 'lucide-react-native';
import { useCartStore } from '../store/cartStore';
import { useTableStore } from '../store/tableStore';
import { useOrderStore } from '../store/orderStore';
import { money } from '../utils/format';
import { colors } from '../constants/colors';

/**
 * Payment — choose method (NFC / Card / Pay at table), then "tap to pay".
 *
 * Confirming the payment fires placeOrder() and routes to OrderConfirmed.
 *
 * TODO when integrating Stripe Terminal:
 *   - Replace simulatePayment() with stripe-terminal-react-native
 *     SDK collectPaymentMethod + processPayment.
 *   - Show real reader status, animations, errors.
 *   - On approve → onPaymentSuccess(); on decline → show retry.
 */

const METHODS = [
  {
    id: 'nfc',
    label: 'NFC Tap',
    description: 'Card or phone · Fastest',
    Icon: Wifi,
    fast: true,
  },
  {
    id: 'card',
    label: 'Card',
    description: 'Visa · MC · Amex · Apple Pay',
    Icon: CreditCard,
  },
  {
    id: 'cash',
    label: 'Pay at table',
    description: 'Cash · Server brings reader',
    Icon: Banknote,
  },
];

const PaymentScreen = ({ navigation }) => {
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore((s) => s.subtotal());
  const tax = useCartStore((s) => s.tax());
  const tip = useCartStore((s) => s.tip());
  const total = useCartStore((s) => s.total());
  const clearCart = useCartStore((s) => s.clearCart);
  const tableNumber = useTableStore((s) => s.tableNumber);
  const placeOrder = useOrderStore((s) => s.placeOrder);

  const [methodId, setMethodId] = useState('nfc');
  const [tapping, setTapping] = useState(false);

  const onTapToPay = () => {
    // Simulate NFC interaction → settle → place order on the server.
    // (Stripe Terminal SDK replaces the timeout when hardware lands.)
    setTapping(true);
    setTimeout(async () => {
      const order = await placeOrder({
        lines,
        totals: { subtotal, tax, tip, total },
        table: tableNumber,
      });
      clearCart();
      setTapping(false);
      navigation.replace('OrderConfirmed', { orderToken: order.token });
    }, 1500);
  };

  return (
    <View className="flex-1 bg-surface">
      <StatusBar barStyle="dark-content" backgroundColor={colors.card} />

      {/* Header */}
      <SafeAreaView edges={['top']} className="bg-card border-b border-line">
        <View className="px-6 py-4 flex-row items-center justify-between">
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-12 h-12 rounded-2xl bg-surface border border-line items-center justify-center"
            hitSlop={6}
          >
            <ChevronLeft size={22} color={colors.ink[900]} strokeWidth={2.2} />
          </Pressable>
          <View className="flex-1 ml-3">
            <Text className="text-ink-900 text-xl font-bold">Payment</Text>
            <Text className="text-ink-500 text-xs">Step 2 of 2 · Choose how to pay</Text>
          </View>
          <Text className="text-ink-500 text-xs">Secured by Stripe</Text>
        </View>
      </SafeAreaView>

      <View className="flex-1 px-4 pt-4">
        {/* Order summary collapsed */}
        <View className="bg-card border border-line rounded-2xl p-4 mb-5 flex-row items-center">
          <View className="flex-1">
            <Text className="text-ink-500 text-xs font-bold tracking-widest">
              YOUR ORDER · TABLE {tableNumber}
            </Text>
            <Text className="text-ink-900 text-2xl font-bold mt-2">{money(total)}</Text>
            <Text className="text-ink-500 text-xs mt-1">
              {lines.length} items · Subtotal {money(subtotal)} · Tax {money(tax)} · Tip {money(tip)}
            </Text>
          </View>
        </View>

        {/* Method tabs */}
        <Text className="text-ink-900 text-sm font-bold mb-2">Payment method</Text>
        <View className="flex-row gap-2 mb-6">
          {METHODS.map((m) => {
            const active = m.id === methodId;
            const Icon = m.Icon;
            return (
              <Pressable
                key={m.id}
                onPress={() => setMethodId(m.id)}
                className={`flex-1 rounded-2xl p-3 border-2 ${
                  active ? 'bg-ink-900 border-ink-900' : 'bg-card border-line'
                }`}
                style={{ borderWidth: active ? 2 : 1 }}
              >
                <Icon
                  size={22}
                  color={active ? colors.card : colors.ink[700]}
                  strokeWidth={1.8}
                />
                <Text
                  className={`text-sm font-bold mt-2 ${
                    active ? 'text-card' : 'text-ink-900'
                  }`}
                >
                  {m.label}
                </Text>
                <Text
                  className={`text-[10px] mt-1 ${
                    active ? 'text-ink-300' : 'text-ink-500'
                  }`}
                >
                  {m.description}
                </Text>
                {m.fast && (
                  <View className="absolute top-3 right-3 bg-brand rounded-md px-1.5 py-0.5">
                    <Text className="text-card text-[9px] font-bold">FAST</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Main NFC area */}
        <View className="flex-1 bg-card border border-line rounded-3xl items-center justify-center px-6">
          {/* Status pill */}
          <View className="flex-row items-center bg-brand-light rounded-pill px-4 py-2 mb-6">
            <View className="w-2.5 h-2.5 rounded-full bg-brand mr-2" />
            <Text className="text-brand-dark text-xs font-bold tracking-widest">
              {tapping ? 'AUTHORIZING…' : 'WAITING FOR TAP…'}
            </Text>
          </View>

          {/* Pulse rings */}
          <View className="items-center justify-center w-72 h-72 my-4">
            <View className="absolute w-72 h-72 rounded-full bg-brand-light opacity-40" />
            <View className="absolute w-56 h-56 rounded-full bg-brand-light opacity-70" />
            <View className="absolute w-40 h-40 rounded-full bg-brand-light" />
            <Wifi
              size={88}
              color={colors.brand.primary}
              strokeWidth={3}
              style={{ transform: [{ rotate: '-90deg' }] }}
            />
          </View>

          <Text className="text-ink-900 text-2xl font-bold text-center mt-4">
            Tap your card or phone
          </Text>
          <Text className="text-ink-700 text-sm text-center mt-2">
            Hold your contactless card flat to this device
          </Text>
          <Text className="text-ink-500 text-xs text-center mt-1">
            Apple Pay · Google Pay · Visa · Mastercard · Amex
          </Text>
        </View>

        {/* Security row */}
        <View className="bg-line-subtle rounded-2xl px-4 py-3 mt-4 flex-row items-center">
          <Shield size={20} color={colors.ink[700]} strokeWidth={1.8} />
          <View className="flex-1 ml-3">
            <Text className="text-ink-900 text-xs font-bold">
              End-to-end encrypted · PCI DSS Level 1
            </Text>
            <Text className="text-ink-500 text-[10px] mt-0.5">
              Card details are never stored on the device. Powered by Stripe Terminal.
            </Text>
          </View>
        </View>
      </View>

      {/* Sticky bottom bar */}
      <SafeAreaView edges={['bottom']} className="bg-card border-t border-line">
        <View className="px-4 py-3 flex-row items-center gap-3">
          <Pressable
            onPress={() => navigation.goBack()}
            className="bg-card border border-line h-16 px-5 rounded-2xl items-center justify-center flex-1"
          >
            <Text className="text-ink-700 text-sm font-bold">Cancel</Text>
          </Pressable>
          <View className="flex-1 items-center">
            <Text className="text-ink-500 text-xs">Total payable</Text>
            <Text className="text-ink-900 text-2xl font-bold">{money(total)}</Text>
          </View>
          <Pressable
            onPress={onTapToPay}
            disabled={tapping || methodId !== 'nfc'}
            className={`h-20 px-6 rounded-2xl items-center justify-center ${
              tapping ? 'bg-ink-700' : 'bg-ink-900'
            } ${methodId !== 'nfc' ? 'opacity-40' : ''}`}
            style={{ flex: 1 }}
          >
            <Wifi
              size={22}
              color={colors.card}
              strokeWidth={2.5}
              style={{ transform: [{ rotate: '-90deg' }] }}
            />
            <Text className="text-card text-[11px] font-bold mt-1">TAP</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default PaymentScreen;
