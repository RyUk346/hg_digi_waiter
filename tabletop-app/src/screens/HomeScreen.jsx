import React from 'react';
import { View, Text, ScrollView, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import Header from '../components/Header';
import CategoryCard from '../components/CategoryCard';
import MenuItemCard from '../components/MenuItemCard';
import CartBar from '../components/CartBar';
import { useMenuStore, getFeatured } from '../store/menuStore';
import { useResponsive } from '../hooks/useResponsive';
import { colors } from '../constants/colors';

/**
 * Home — browse categories + featured items.
 *
 * Layout adapts via useResponsive:
 *   compact → 1 featured / 2-col categories
 *   tablet  → 2 featured / 2-col categories  (target 800×1280)
 *   wide    → 3 featured / 4-col categories
 */

const HomeScreen = ({ navigation }) => {
  const { categoryCols, featuredCols } = useResponsive();
  const items = useMenuStore((s) => s.items);
  const categories = useMenuStore((s) => s.categories);
  const featured = getFeatured(items);

  // Chunk array into rows of `n` for grid layout
  const chunk = (arr, n) => {
    const rows = [];
    for (let i = 0; i < arr.length; i += n) rows.push(arr.slice(i, i + n));
    return rows;
  };

  const featuredRows = chunk(featured.slice(0, featuredCols), featuredCols);
  const categoryRows = chunk(categories, categoryCols);

  return (
    <View className="flex-1 bg-surface">
      <StatusBar barStyle="dark-content" backgroundColor={colors.card} />
      <SafeAreaView edges={['top']} className="bg-card">
        <Header />
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search */}
        <View className="px-6 mt-4">
          <Pressable className="bg-card border border-line rounded-2xl h-14 flex-row items-center px-5">
            <Search size={20} color={colors.ink[500]} strokeWidth={1.8} />
            <Text className="text-ink-500 text-sm ml-3">
              Search dishes, drinks, or categories…
            </Text>
          </Pressable>
        </View>

        {/* Today's Highlights */}
        <View className="px-6 mt-7 flex-row justify-between items-baseline">
          <Text className="text-ink-900 text-lg font-bold">Today's Highlights</Text>
          <Text className="text-brand text-sm font-semibold">See all</Text>
        </View>

        <View className="px-6 mt-3">
          {featuredRows.map((row, ri) => (
            <View key={ri} className="flex-row gap-3 mb-3">
              {row.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  variant="tile"
                  onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
                />
              ))}
              {/* Pad the last row if needed to keep equal widths */}
              {row.length < featuredCols &&
                Array.from({ length: featuredCols - row.length }).map((_, i) => (
                  <View key={`pad-${i}`} className="flex-1" />
                ))}
            </View>
          ))}
        </View>

        {/* Categories */}
        <View className="px-6 mt-4 mb-3">
          <Text className="text-ink-900 text-lg font-bold">Browse by category</Text>
        </View>
        <View className="px-6">
          {categoryRows.map((row, ri) => (
            <View key={ri} className="flex-row gap-3 mb-3">
              {row.map((c) => (
                <CategoryCard
                  key={c.id}
                  category={c}
                  onPress={() => navigation.navigate('Category', { categoryId: c.id })}
                />
              ))}
              {row.length < categoryCols &&
                Array.from({ length: categoryCols - row.length }).map((_, i) => (
                  <View key={`pad-${i}`} className="flex-1" />
                ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <CartBar />
    </View>
  );
};

export default HomeScreen;
