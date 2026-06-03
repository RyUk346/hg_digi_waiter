import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from '../screens/WelcomeScreen';
import HomeScreen from '../screens/HomeScreen';
import CategoryScreen from '../screens/CategoryScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import CartScreen from '../screens/CartScreen';
import PaymentScreen from '../screens/PaymentScreen';
import OrderConfirmedScreen from '../screens/OrderConfirmedScreen';
import OrderStatusScreen from '../screens/OrderStatusScreen';

import { colors } from '../constants/colors';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: colors.brand.primary,
          background: colors.surface,
          card: colors.card,
          text: colors.ink[900],
          border: colors.line.DEFAULT,
          notification: colors.brand.primary,
        },
      }}
    >
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Category" component={CategoryScreen} />
        <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen
          name="OrderConfirmed"
          component={OrderConfirmedScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="OrderStatus" component={OrderStatusScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
