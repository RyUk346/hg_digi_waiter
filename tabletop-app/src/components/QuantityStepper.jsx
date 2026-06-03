import React from 'react';
import { Pressable, Text, View } from 'react-native';

/**
 * –  N  +   stepper.
 *
 * Props:
 *   value      number
 *   onChange   (next: number) => void
 *   min        default 0
 *   max        default 99
 *   size       'sm' | 'md' (default 'md')
 */

const QuantityStepper = ({ value, onChange, min = 0, max = 99, size = 'md' }) => {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  const h = size === 'sm' ? 'h-9' : 'h-12';
  const w = size === 'sm' ? 'w-9' : 'w-12';
  const text = size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <View
      className={`${h} flex-row items-center bg-surface border border-line rounded-2xl`}
      style={{ alignSelf: 'flex-start' }}
    >
      <Pressable
        onPress={dec}
        className={`${w} ${h} items-center justify-center`}
        hitSlop={6}
        disabled={value <= min}
      >
        <Text className={`${text} font-bold ${value <= min ? 'text-ink-300' : 'text-ink-900'}`}>
          –
        </Text>
      </Pressable>
      <Text className={`${text} font-bold text-ink-900 px-2 min-w-8 text-center`}>{value}</Text>
      <Pressable
        onPress={inc}
        className={`${w} ${h} items-center justify-center`}
        hitSlop={6}
        disabled={value >= max}
      >
        <Text className={`${text} font-bold ${value >= max ? 'text-ink-300' : 'text-brand'}`}>
          +
        </Text>
      </Pressable>
    </View>
  );
};

export default QuantityStepper;
