import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { moneyDelta } from '../utils/format';
import { colors } from '../constants/colors';

/**
 * A single multi-select row used for extras / removable / spice level / size.
 *
 * Props:
 *   label        string
 *   sublabel     string (optional, shown under label)
 *   priceDelta   number  (shown on right; pass 0 for "included")
 *   selected     boolean
 *   onPress      () => void
 *   mode         'check' | 'radio' (default 'check')
 *   tone         'default' | 'remove' (strikethrough on selection)
 */

const AddOnRow = ({
  label,
  sublabel,
  priceDelta,
  selected,
  onPress,
  mode = 'check',
  tone = 'default',
}) => {
  const bg = selected ? 'bg-brand-light border-brand' : 'bg-card border-line';

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center border-2 rounded-2xl px-3 py-3 mb-2 ${bg}`}
      style={{ borderWidth: selected ? 2 : 1 }}
    >
      {/* Indicator */}
      {mode === 'radio' ? (
        <View
          className={`w-5 h-5 rounded-full mr-3 items-center justify-center border-2 ${
            selected ? 'border-brand bg-card' : 'border-ink-300 bg-card'
          }`}
        >
          {selected && <View className="w-2.5 h-2.5 rounded-full bg-brand" />}
        </View>
      ) : (
        <View
          className={`w-6 h-6 rounded-md mr-3 items-center justify-center ${
            selected ? 'bg-brand' : 'bg-card border-2 border-ink-300'
          }`}
        >
          {selected && <Check size={16} color={colors.card} strokeWidth={3} />}
        </View>
      )}

      <View className="flex-1">
        <Text
          className={`text-sm font-semibold ${
            tone === 'remove' && selected ? 'text-status-out' : 'text-ink-900'
          }`}
          style={tone === 'remove' && selected ? { textDecorationLine: 'line-through' } : undefined}
        >
          {label}
        </Text>
        {sublabel ? <Text className="text-ink-500 text-xs mt-0.5">{sublabel}</Text> : null}
      </View>

      {priceDelta != null && (
        <Text className="text-ink-900 text-sm font-bold ml-3">
          {priceDelta === 0 ? '+ $0.00' : moneyDelta(priceDelta)}
        </Text>
      )}
    </Pressable>
  );
};

export default AddOnRow;
