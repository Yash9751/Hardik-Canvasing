import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '../contexts/AuthContext';
import { CompanyProfileProvider } from '../contexts/CompanyProfileContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <AuthProvider>
      <CompanyProfileProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="add-buy" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="sell-parties" options={{ headerShown: false }} />
            <Stack.Screen name="all-trades-reports" options={{ headerShown: false }} />
            <Stack.Screen name="pending-trades-reports" options={{ headerShown: false }} />
            <Stack.Screen name="overdue-trades-reports" options={{ headerShown: false }} />
            <Stack.Screen name="party-wise-reports" options={{ headerShown: false }} />
            <Stack.Screen name="broker-wise-reports" options={{ headerShown: false }} />
            <Stack.Screen name="item-plants" options={{ headerShown: false }} />
                          <Stack.Screen name="stock-wise-reports" options={{ headerShown: false }} />
                                <Stack.Screen name="pnl-report" options={{ headerShown: false }} />
                  <Stack.Screen name="broadcast-rates" options={{ headerShown: false }} />
            <Stack.Screen name="todays-purchase" options={{ headerShown: false }} />
            <Stack.Screen name="todays-sell" options={{ headerShown: false }} />
            <Stack.Screen name="purchase-loading" options={{ headerShown: false }} />
            <Stack.Screen name="sell-loading" options={{ headerShown: false }} />
            <Stack.Screen name="settings/company-profile" options={{ headerShown: false }} />
            <Stack.Screen name="settings/sauda" options={{ headerShown: false }} />
            <Stack.Screen name="settings/loading" options={{ headerShown: false }} />
            <Stack.Screen name="settings/payment-conditions" options={{ headerShown: false }} />
            <Stack.Screen name="settings/delivery-conditions" options={{ headerShown: false }} />
            <Stack.Screen name="settings/ex-plants" options={{ headerShown: false }} />
            <Stack.Screen name="settings/brokers" options={{ headerShown: false }} />
            <Stack.Screen name="settings/items" options={{ headerShown: false }} />
            <Stack.Screen name="settings/parties" options={{ headerShown: false }} />
            <Stack.Screen name="all-trades-breakdown" options={{ headerShown: false }} />
            <Stack.Screen name="future-pl-breakdown" options={{ headerShown: false }} />
            <Stack.Screen name="view-sauda" options={{ headerShown: false }} />
            <Stack.Screen name="party-stock-details" options={{ headerShown: false }} />
            <Stack.Screen name="purchase-parties" options={{ headerShown: false }} />
            <Stack.Screen name="add-purchase" options={{ headerShown: false }} />
            <Stack.Screen name="add-item" options={{ headerShown: false }} />
            <Stack.Screen name="add-broker" options={{ headerShown: false }} />
            <Stack.Screen name="add-party" options={{ headerShown: false }} />
            <Stack.Screen name="add-sell-loading" options={{ headerShown: false }} />
            <Stack.Screen name="add-purchase-loading" options={{ headerShown: false }} />
            <Stack.Screen name="add-ex-plant" options={{ headerShown: false }} />
            <Stack.Screen name="rate-update" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="dark" />
        </ThemeProvider>
      </CompanyProfileProvider>
    </AuthProvider>
  );
}
