import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import MenuItemCard from '../components/MenuItemCard';
import CartBar from '../components/CartBar';
import { useMenuStore, filterByCategory } from '../store/menuStore';
import { colors } from '../constants/colors';

/**
 * CategoryScreen — list of items in a single category.
 *
 * Route params:
 *   categoryId: string
 *
 * Filter chips at top let the user narrow by tag (e.g. Beef / Chicken / Veggie).
 */

const FILTER_TAGS_BY_CATEGORY = {
  burgers: ['All', 'Beef', 'Chicken', 'Veggie', '🌶 Spicy'],
  pizza: ['All', 'Veggie', 'Meat'],
  coffee: ['All', 'Hot', 'Iced'],
};

const CategoryScreen = ({ route, navigation }) => {
  const { categoryId } = route.params;
  const allItems = useMenuStore((s) => s.items);
  const categories = useMenuStore((s) => s.categories);
  const category = categories.find((c) => c.id === categoryId);
  const items = filterByCategory(allItems, categoryId);

  const filters = FILTER_TAGS_BY_CATEGORY[categoryId] || ['All'];
  const [activeFilter, setActiveFilter] = useState(filters[0]);

  // Naive filter: match tags (case-insensitive, strips emoji)
  const filtered =
    activeFilter === filters[0]
      ? items
      : items.filter((i) =>
          (i.tags || []).some(
            (t) =>
              t.toLowerCase() === activeFilter.toLowerCase() ||
              activeFilter.toLowerCase().includes(t.toLowerCase()),
          ),
        );

  return (
    <View className="flex-1 bg-surface">
      <StatusBar barStyle="dark-content" backgroundColor={colors.card} />
      <SafeAreaView edges={['top']} className="bg-card">
        <Header
          back
          title={category?.name || 'Menu'}
          subtitle={`${items.length} items · ${category?.blurb || ''}`}
        />
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}
        >
          {filters.map((f) => {
            const active = f === activeFilter;
            return (
              <Pressable
                key={f}
                onPress={() => setActiveFilter(f)}
                className={`h-10 px-4 rounded-pill mr-2 items-center justify-center ${
                  active ? 'bg-ink-900' : 'bg-card border border-line'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    active ? 'text-card' : 'text-ink-700'
                  }`}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Count + sort */}
        <View className="flex-row justify-between items-center px-6 mb-4">
          <Text className="text-ink-500 text-xs">
            Showing {filtered.length} of {items.length}
          </Text>
          <Pressable className="bg-card border border-line rounded-xl px-3 py-1.5">
            <Text className="text-ink-700 text-xs font-semibold">Sort ▾</Text>
          </Pressable>
        </View>

        {/* Items */}
        <View className="px-6">
          {filtered.map((item) => (
            <MenuItemCard
              key={item.id}
              item={{ ...item, featured: (item.tags || []).includes('signature') }}
              variant="row"
              onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
            />
          ))}
        </View>

        {filtered.length === 0 && (
          <View className="items-center py-12">
            <Text className="text-ink-500 text-sm">No items match this filter.</Text>
          </View>
        )}
      </ScrollView>

      <CartBar />
    </View>
  );
};

export default CategoryScreen;
