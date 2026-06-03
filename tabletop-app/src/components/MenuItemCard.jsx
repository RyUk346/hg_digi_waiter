import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { money } from '../utils/format';
import { colors } from '../constants/colors';

/**
 * Menu item card — used in:
 *   - Featured row on Home (variant="featured", larger)
 *   - Category browse rows (variant="row", wide horizontal layout)
 *   - Grid tiles (variant="tile", default for category grid)
 *
 * Tapping the card opens item detail; tapping `+` opens with auto-add intent
 * (or could add with defaults — currently routes to detail).
 */

const Badge = ({ children, color = 'brand' }) => {
  const colorMap = {
    brand: 'text-brand',
    ready: 'text-status-ready',
    out: 'text-status-out',
    preparing: 'text-status-preparing',
  };
  return (
    <View className="bg-card rounded-pill px-2 py-1 self-start">
      <Text className={`${colorMap[color] || 'text-brand'} text-[10px] font-bold`}>
        {children}
      </Text>
    </View>
  );
};

const MenuItemCard = ({ item, variant = 'tile', onPress }) => {
  if (variant === 'row') {
    // Wide horizontal row used on category browse
    return (
      <Pressable
        onPress={onPress}
        className={`bg-card border ${
          item.featured ? 'border-brand' : 'border-line'
        } rounded-2xl p-4 flex-row mb-3`}
      >
        <View className={`bg-${item.tint || 'brand-light'} w-36 h-36 rounded-2xl items-center justify-center mr-4`}>
          <Text style={{ fontSize: 64 }}>{item.image}</Text>
        </View>
        <View className="flex-1 justify-between">
          <View>
            {item.badge ? <Badge>{item.badge}</Badge> : null}
            <Text className="text-ink-900 text-lg font-bold mt-2" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-ink-500 text-xs mt-1" numberOfLines={2}>
              {item.description}
            </Text>
          </View>
          <View className="flex-row items-end justify-between mt-2">
            <Text className="text-ink-900 text-xl font-bold">{money(item.price)}</Text>
            <Pressable
              onPress={onPress}
              className="bg-brand h-10 px-4 rounded-2xl flex-row items-center justify-center"
              hitSlop={6}
            >
              <Text className="text-card text-sm font-bold">+ Add</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  }

  // Default "tile" variant — 2-column grid on Home
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 bg-card border border-line rounded-2xl overflow-hidden"
    >
      <View className={`bg-${item.tint || 'brand-light'} h-32 items-center justify-center relative`}>
        <Text style={{ fontSize: 64 }}>{item.image}</Text>
        {item.badge && (
          <View className="absolute top-3 left-3">
            <Badge>{item.badge}</Badge>
          </View>
        )}
      </View>
      <View className="p-3">
        <Text className="text-ink-900 text-sm font-bold" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="text-ink-500 text-xs mt-1" numberOfLines={1}>
          {item.description}
        </Text>
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-ink-900 text-base font-bold">{money(item.price)}</Text>
          <Pressable
            onPress={onPress}
            className="w-9 h-9 rounded-xl bg-brand items-center justify-center"
            hitSlop={6}
          >
            <Plus size={20} color={colors.card} strokeWidth={3} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

export default MenuItemCard;
