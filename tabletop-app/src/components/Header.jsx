import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronLeft, ShoppingBag } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useCartStore } from '../store/cartStore';
import { useTableStore } from '../store/tableStore';
import { colors } from '../constants/colors';

/**
 * Shared top header.
 *   <Header /> — default: brand + table chip + cart icon
 *   <Header title="Burgers" subtitle="9 items" back />  — back arrow + title
 *
 * Props:
 *   title       string (optional)
 *   subtitle    string (optional)
 *   back        boolean — show back arrow
 *   onBack      () => void
 *   showCart    boolean (default true)
 *   right       ReactNode — slot to override the right side
 */

const Header = ({ title, subtitle, back, onBack, showCart = true, right }) => {
  const nav = useNavigation();
  const itemCount = useCartStore((s) => s.itemCount());
  const tableNumber = useTableStore((s) => s.tableNumber);
  const cafeName = useTableStore((s) => s.cafeName);

  return (
    <View className="bg-card border-b border-line px-6 pt-3 pb-4">
      {/* Status bar row */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-ink-500 text-[11px] font-semibold">19:42</Text>
        <Text className="text-ink-500 text-[11px]">Wi-Fi · HG-Guest</Text>
      </View>

      {/* Main row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          {back && (
            <Pressable
              onPress={onBack || (() => nav.goBack())}
              className="w-12 h-12 rounded-2xl bg-surface border border-line items-center justify-center mr-3"
              hitSlop={8}
            >
              <ChevronLeft size={22} color={colors.ink[900]} strokeWidth={2.2} />
            </Pressable>
          )}
          <View className="flex-1">
            <Text className="text-ink-900 text-xl font-bold">
              {title || cafeName}
            </Text>
            <Text className="text-ink-500 text-xs mt-0.5" numberOfLines={1}>
              {subtitle || 'Browse menu'}
            </Text>
          </View>
        </View>

        {right || (
          <View className="flex-row items-center gap-2">
            {/* Table chip */}
            <View className="flex-row items-center bg-surface border border-line rounded-pill px-3 h-9">
              <View className="w-2 h-2 rounded-full bg-status-ready mr-2" />
              <Text className="text-ink-900 text-xs font-semibold">Table {tableNumber}</Text>
            </View>

            {showCart && (
              <Pressable
                onPress={() => nav.navigate('Cart')}
                className="w-12 h-12 rounded-2xl bg-surface border border-line items-center justify-center"
                hitSlop={4}
              >
                <ShoppingBag size={20} color={colors.ink[900]} strokeWidth={1.8} />
                {itemCount > 0 && (
                  <View
                    className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-brand items-center justify-center"
                    pointerEvents="none"
                  >
                    <Text className="text-card text-[10px] font-bold">{itemCount}</Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

export default Header;
