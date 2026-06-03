import React from 'react';
import { Pressable, Text, View } from 'react-native';

/**
 * Category tile (large rounded card with emoji circle + name + blurb).
 * Used on Home in a 2-col grid (or 4-col on wide screens).
 */

const CategoryCard = ({ category, onPress }) => {
  const tintBg = category.tint ? `bg-${category.tint}` : 'bg-brand-light';

  return (
    <Pressable
      onPress={onPress}
      className="flex-1 bg-card border border-line rounded-2xl p-4 flex-row items-center"
      style={{ minHeight: 120 }}
    >
      <View className={`${tintBg} w-16 h-16 rounded-full items-center justify-center mr-3`}>
        <Text style={{ fontSize: 28 }}>{category.emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-ink-900 text-base font-bold">{category.name}</Text>
        <Text className="text-ink-500 text-xs mt-1" numberOfLines={2}>
          {category.count} items · {category.blurb}
        </Text>
      </View>
    </Pressable>
  );
};

export default CategoryCard;
