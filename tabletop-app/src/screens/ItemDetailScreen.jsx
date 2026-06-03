import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Heart, Share2 } from 'lucide-react-native';
import AddOnRow from '../components/AddOnRow';
import QuantityStepper from '../components/QuantityStepper';
import { findItem } from '../data/menu';
import { useCartStore } from '../store/cartStore';
import { money } from '../utils/format';
import { colors } from '../constants/colors';

/**
 * ItemDetailScreen — full customization view for one menu item.
 *
 * Route params:
 *   itemId: string
 *
 * State (local):
 *   - selected variant (single)
 *   - selected extras (multi)
 *   - removed ingredients (multi)
 *   - spice level (single)
 *   - quantity
 *
 * Total price recalculates on every change.
 */

const ItemDetailScreen = ({ route, navigation }) => {
  const { itemId } = route.params;
  const item = findItem(itemId);
  const addLine = useCartStore((s) => s.addLine);

  const [variantId, setVariantId] = useState(item?.variants?.[0]?.id);
  const [extraIds, setExtraIds] = useState(() => new Set());
  const [removedIds, setRemovedIds] = useState(() => new Set());
  const [spiceId, setSpiceId] = useState(item?.spice?.[0]?.id);
  const [quantity, setQuantity] = useState(1);

  const variant = item?.variants?.find((v) => v.id === variantId);
  const extras = (item?.extras || []).filter((e) => extraIds.has(e.id));
  const removed = (item?.removable || []).filter((r) => removedIds.has(r.id));
  const spice = item?.spice?.find((s) => s.id === spiceId);

  const unitPrice = useMemo(() => {
    if (!item) return 0;
    const variantDelta = variant?.priceDelta ?? 0;
    const extrasDelta = extras.reduce((s, e) => s + (e.priceDelta || 0), 0);
    return item.price + variantDelta + extrasDelta;
  }, [item, variant, extras]);

  const lineTotal = unitPrice * quantity;

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Text className="text-ink-700">Item not found.</Text>
      </View>
    );
  }

  const toggleId = (set, id) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const onAddToCart = () => {
    addLine({
      itemId: item.id,
      name: item.name,
      image: item.image,
      basePrice: item.price,
      quantity,
      variant: variant ? { id: variant.id, name: variant.name, priceDelta: variant.priceDelta } : null,
      extras: extras.map((e) => ({ id: e.id, name: e.name, priceDelta: e.priceDelta })),
      removed: removed.map((r) => ({ id: r.id, name: r.name })),
      spice: spice ? { id: spice.id, name: spice.name } : null,
      notes: '',
    });
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-surface">
      <StatusBar barStyle="dark-content" backgroundColor={colors.brand.light} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className={`bg-${item.tint || 'brand-light'} h-96 items-center justify-center relative`}>
          <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0 px-5 pt-3 z-10">
            <View className="flex-row justify-between items-start">
              <Pressable
                onPress={() => navigation.goBack()}
                className="w-12 h-12 rounded-2xl bg-card items-center justify-center"
                hitSlop={8}
              >
                <ChevronLeft size={22} color={colors.ink[900]} strokeWidth={2.2} />
              </Pressable>
              <View className="flex-row gap-2">
                <Pressable className="w-12 h-12 rounded-2xl bg-card items-center justify-center">
                  <Heart size={20} color={colors.ink[900]} strokeWidth={2} />
                </Pressable>
                <Pressable className="w-12 h-12 rounded-2xl bg-card items-center justify-center">
                  <Share2 size={18} color={colors.ink[900]} strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          </SafeAreaView>

          <Text style={{ fontSize: 180 }}>{item.image}</Text>
        </View>

        {/* Title card overlap */}
        <View className="px-4 -mt-10">
          <View className="bg-card border border-line rounded-3xl p-5">
            {item.badge ? (
              <View className="self-start bg-brand-light rounded-pill px-2.5 py-1 mb-2">
                <Text className="text-brand-dark text-[10px] font-bold">{item.badge}</Text>
              </View>
            ) : null}
            <View className="flex-row justify-between items-start">
              <View className="flex-1 pr-3">
                <Text className="text-ink-900 text-2xl font-bold">{item.name}</Text>
                <Text className="text-ink-500 text-xs mt-1">{item.description}</Text>
              </View>
              <View className="items-end">
                <Text className="text-ink-900 text-2xl font-bold">{money(item.price)}</Text>
                <Text className="text-ink-500 text-xs mt-1">★ 4.8 · 312</Text>
              </View>
            </View>
            {item.longDescription && (
              <Text className="text-ink-700 text-sm mt-3 leading-5">
                {item.longDescription}
              </Text>
            )}
          </View>
        </View>

        {/* Sections */}
        <View className="px-4 mt-6">
          {/* Size variants */}
          {item.variants?.length > 1 && (
            <View className="mb-6">
              <View className="flex-row justify-between items-baseline mb-2">
                <Text className="text-ink-900 text-base font-bold">Size</Text>
                <Text className="text-status-out text-xs font-bold">REQUIRED</Text>
              </View>
              {item.variants.map((v) => (
                <AddOnRow
                  key={v.id}
                  mode="radio"
                  label={v.name}
                  sublabel={v.blurb}
                  priceDelta={v.priceDelta}
                  selected={variantId === v.id}
                  onPress={() => setVariantId(v.id)}
                />
              ))}
            </View>
          )}

          {/* Extras */}
          {item.extras?.length > 0 && (
            <View className="mb-6">
              <View className="flex-row justify-between items-baseline mb-2">
                <Text className="text-ink-900 text-base font-bold">Add extras</Text>
                <Text className="text-ink-500 text-xs">Pick any (optional)</Text>
              </View>
              {item.extras.map((e) => (
                <AddOnRow
                  key={e.id}
                  label={e.name}
                  priceDelta={e.priceDelta}
                  selected={extraIds.has(e.id)}
                  onPress={() => setExtraIds(toggleId(extraIds, e.id))}
                />
              ))}
            </View>
          )}

          {/* Remove items */}
          {item.removable?.length > 0 && (
            <View className="mb-6">
              <View className="flex-row justify-between items-baseline mb-2">
                <Text className="text-ink-900 text-base font-bold">Remove items</Text>
                <Text className="text-ink-500 text-xs">Tap to strike</Text>
              </View>
              <View className="flex-row flex-wrap -mx-1">
                {item.removable.map((r) => {
                  const sel = removedIds.has(r.id);
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => setRemovedIds(toggleId(removedIds, r.id))}
                      className={`m-1 px-4 py-2.5 rounded-2xl border-2 ${
                        sel ? 'bg-brand-light border-status-out' : 'bg-card border-line'
                      }`}
                      style={{ borderWidth: sel ? 2 : 1, borderStyle: sel ? 'dashed' : 'solid' }}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          sel ? 'text-status-out' : 'text-ink-700'
                        }`}
                        style={sel ? { textDecorationLine: 'line-through' } : undefined}
                      >
                        {r.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Spice */}
          {item.spice?.length > 0 && (
            <View className="mb-6">
              <Text className="text-ink-900 text-base font-bold mb-2">Spice level</Text>
              <View className="flex-row gap-2">
                {item.spice.map((sp) => {
                  const sel = spiceId === sp.id;
                  return (
                    <Pressable
                      key={sp.id}
                      onPress={() => setSpiceId(sp.id)}
                      className={`flex-1 h-12 rounded-2xl border-2 items-center justify-center ${
                        sel ? 'bg-brand-light border-brand' : 'bg-card border-line'
                      }`}
                      style={{ borderWidth: sel ? 2 : 1 }}
                    >
                      <Text
                        className={`text-sm font-bold ${sel ? 'text-brand' : 'text-ink-900'}`}
                      >
                        {sp.emoji ? `${sp.emoji} ` : ''}
                        {sp.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky bottom: Quantity + Add to cart */}
      <View className="bg-card border-t border-line px-4 py-4">
        <SafeAreaView edges={['bottom']}>
          <View className="flex-row items-center gap-3">
            <QuantityStepper value={quantity} onChange={setQuantity} min={1} />
            <Pressable
              onPress={onAddToCart}
              className="flex-1 bg-brand h-14 rounded-2xl flex-row items-center justify-between px-5"
            >
              <Text className="text-card text-sm font-bold">
                Add {quantity > 1 ? `${quantity} ` : ''}to cart
              </Text>
              <Text className="text-card text-lg font-bold">{money(lineTotal)}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
};

export default ItemDetailScreen;
