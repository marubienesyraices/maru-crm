import { useEffect } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiRequest } from '../lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications requieren un dispositivo físico');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Permiso de notificaciones denegado');
    return null;
  }

  // Obtener token FCM/APNs vía Expo
  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Configuración específica de Android
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1a56db',
    });
  }

  // Registrar el token en el backend
  try {
    await apiRequest('/api/users/push-token', {
      method: 'PATCH',
      body: JSON.stringify({ pushToken: token }),
    });
  } catch (err) {
    console.warn('No se pudo registrar el push token:', err);
  }

  return token;
}

export function useNotificationListeners(
  onNotification: (notification: Notifications.Notification) => void,
  onResponse: (response: Notifications.NotificationResponse) => void,
) {
  useEffect(() => {
    const notifListener = Notifications.addNotificationReceivedListener(onNotification);
    const responseListener = Notifications.addNotificationResponseReceivedListener(onResponse);
    return () => {
      notifListener.remove();
      responseListener.remove();
    };
  }, []);
}
