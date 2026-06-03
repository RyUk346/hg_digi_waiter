import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useCartStore } from '../store/cartStore';
import { money } from '../utils/format';

/**
 * Tip selector — 5 options:
 *   10% | 15% | 20% | Custom | No tip
 *
 * Internally reads/writes the cart store.
 */

const TipOption = ({ active, top, bottom, onPress }) => (
  <Pressable
    onPress={onPress}
    className={`flex-1 mx-1 rounded-2xl py-3 border-2 ${
      active ? 'bg-brand-light border-brand' : 'bg-card border-line'
    }`}
    style={{ borderWidth: active ? 2 : 1 }}
  >
    <Text
      className={`text-center text-base font-bold ${
        active ? 'text-brand' : 'text-ink-900'
      }`}
    >
      {top}
    </Text>
    <Text
      className={`text-center text-xs mt-1 ${active ? 'text-brand' : 'text-ink-500'}`}
    >
      {bottom}
    </Text>
  </Pressable>
);

const TipSelector = () => {
  const subtotal = useCartStore((s) => s.subtotal());
  const tipPercent = useCartStore((s) => s.tipPercent);
  const tipCustom = useCartStore((s) => s.tipCustom);
  const setTipPercent = useCartStore((s) => s.setTipPercent);

  const calc = (pct) => subtotal * (pct / 100);

  return (
    <View>
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-ink-900 text-base font-bold">Add a tip for your server</Text>
        <Text className="text-ink-500 text-xs">100% goes to staff</Text>
      </View>
      <View className="flex-row -mx-1">
        <TipOption
          active={tipPercent === 10}
          top="10%"
          bottom={money(calc(10))}
          onPress={() => setTipPercent(10)}
        />
        <TipOption
          active={tipPercent === 15}
          top="15%"
          bottom={money(calc(15))}
          onPress={() => setTipPercent(15)}
        />
        <TipOption
          active={tipPercent === 20}
          top="20%"
          bottom={money(calc(20))}
          onPress={() => setTipPercent(20)}
        />
        <TipOption
          active={tipCustom != null}
          top="Custom"
          bottom="Enter $"
          onPress={() => setTipPercent(null)}
        />
        <TipOption
          active={tipPercent === 0}
          top="No tip"
          bottom="—"
          onPress={() => setTipPercent(0)}
        />
      </View>
    </View>
  );
};

export default TipSelector;
