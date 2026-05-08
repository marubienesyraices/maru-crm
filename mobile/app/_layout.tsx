import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { registerForPushNotifications, useNotificationListeners } from '../src/notifications/pushService';

export default function RootLayout() {
  const { loadSession } = useAuthStore();

  useEffect(() => {
    loadSession();
    registerForPushNotifications();
  }, []);

  // Escuchar notificaciones en foreground (solo loguear por ahora)
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
    </Stack>
  );
}
