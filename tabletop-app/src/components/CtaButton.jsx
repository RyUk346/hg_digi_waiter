import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { colors } from '../constants/colors';

/**
 * Primary CTA button — brand fill, white text, arrow on the right.
 *
 * Variants:
 *   variant: 'primary' (default, brand) | 'dark' | 'outline'
 *   arrow:   boolean (default true)
 *   trailing ReactNode — replaces the arrow (e.g. price)
 */

const CtaButton = ({
  label,
  onPress,
  variant = 'primary',
  arrow = true,
  trailing,
  disabled = false,
  fullWidth = true,
  size = 'lg',
  className = '',
}) => {
  const bg =
    variant === 'primary'
      ? 'bg-brand'
      : variant === 'dark'
      ? 'bg-ink-900'
      : 'bg-card border border-line';
  const fg =
    variant === 'outline' ? 'text-ink-900' : 'text-card';

  const height = size === 'lg' ? 'h-16' : 'h-12';
  const text = size === 'lg' ? 'text-base' : 'text-sm';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`${bg} ${height} ${
        fullWidth ? 'w-full' : ''
      } rounded-2xl px-6 flex-row items-center justify-between ${
        disabled ? 'opacity-50' : ''
      } ${className}`}
    >
      <Text className={`${fg} ${text} font-bold flex-1`} numberOfLines={1}>
        {label}
      </Text>
      <View className="flex-row items-center gap-3">
        {trailing}
        {arrow && (
          <ArrowRight
            size={22}
            color={variant === 'outline' ? colors.ink[900] : colors.card}
            strokeWidth={2.4}
          />
        )}
      </View>
    </Pressable>
  );
};

export default CtaButton;
