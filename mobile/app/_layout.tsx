import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { registerForPushNotifications, useNotificationListeners } from '../src/notifications/pushService';

export default function RootLayout() {
  const router = useRouter();
  const { loadSession, user, isLoading } = useAuthStore();

  useEffect(() => {
    loadSession();
    registerForPushNotifications();
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading]);

  useNotificationListeners(
    (notif) => console.log('Notificación recibida:', notif.request.content.title),
    (response) => console.log('Notificación abierta:', response.notification.request.content.title),
  );

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="verify-2fa" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="propiedad/[id]"
        options={{ headerShown: true, title: 'Propiedad', headerTintColor: '#111827' }}
      />
    </Stack>
  );
}
