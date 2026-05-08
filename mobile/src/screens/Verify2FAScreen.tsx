import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Verify2FAScreen() {
  const router = useRouter();
  const { tempToken } = useLocalSearchParams<{ tempToken: string }>();
  const { verify2FA } = useAuthStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    if (code.length !== 6) { Alert.alert('Error', 'El código debe tener 6 dígitos'); return; }
    setLoading(true);
    try {
      await verify2FA(code, tempToken!);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Código inválido', err.message ?? 'Intenta de nuevo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Verificación 2FA</Text>
        <Text style={styles.subtitle}>Ingresa el código de tu app autenticadora</Text>

        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor="#9ca3af"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Verificar</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 28, elevation: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14,
    fontSize: 28, color: '#111827', textAlign: 'center', letterSpacing: 12, marginBottom: 14,
  },
  button: { backgroundColor: '#1a56db', borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
