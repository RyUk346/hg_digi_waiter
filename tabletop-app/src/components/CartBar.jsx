import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowRight, ShoppingBag } from 'lucide-react-native';
import { useCartStore } from '../store/cartStore';
import { money } from '../utils/format';
import { colors } from '../constants/colors';

/**
 * Persistent sticky bar at the bottom of menu / category screens.
 * Hidden when cart is empty.
 * Tapping anywhere navigates to the Cart screen.
 */

const CartBar = () => {
  const nav = useNavigation();
  const itemCount = useCartStore((s) => s.itemCount());
  const subtotal = useCartStore((s) => s.subtotal());

  if (itemCount === 0) return null;

  return (
    <View className="absolute bottom-0 left-0 right-0">
      <Pressable
        onPress={() => nav.navigate('Cart')}
        className="bg-ink-900 mx-4 mb-4 rounded-2xl px-5 py-4 flex-row items-center"
      >
        <View className="w-12 h-12 rounded-xl bg-white/10 items-center justify-center mr-3 relative">
          <ShoppingBag size={22} color={colors.card} strokeWidth={1.8} />
          <View className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-brand items-center justify-center border-2 border-ink-900">
            <Text className="text-card text-[10px] font-bold">{itemCount}</Text>
          </View>
        </View>
        <View className="flex-1">
          <Text className="text-ink-500 text-[10px] font-bold uppercase tracking-widest">
            View cart · {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
          <Text className="text-card text-xl font-bold mt-0.5">{money(subtotal)}</Text>
        </View>
        <View className="bg-brand h-12 px-4 rounded-xl flex-row items-center">
          <Text className="text-card text-sm font-bold mr-2">Checkout</Text>
          <ArrowRight size={18} color={colors.card} strokeWidth={2.4} />
        </View>
      </Pressable>
    </View>
  );
};

export default CartBar;
