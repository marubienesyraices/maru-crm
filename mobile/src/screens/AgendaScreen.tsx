import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { apiRequest } from '../lib/api';

interface Visita {
  id: string;
  propiedad: { titulo: string; departamento?: string };
  cliente: { nombre: string };
  fecha_hora: string;
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'REALIZADA';
}

const ESTADO_COLORS = {
  PENDIENTE: '#d97706',
  CONFIRMADA: '#059669',
  CANCELADA: '#dc2626',
  REALIZADA: '#1a56db',
};

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-GT', {
    timeZone: 'America/Guatemala',
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AgendaScreen() {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadVisitas() {
    try {
      const data = await apiRequest<Visita[]>('/api/visitas?limit=30&orderBy=fecha_hora');
      setVisitas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Error cargando visitas:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadVisitas(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); loadVisitas(); }, []);

  function renderItem({ item }: { item: Visita }) {
    const color = ESTADO_COLORS[item.estado];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.propiedad} numberOfLines={1}>{item.propiedad?.titulo}</Text>
          <View style={[styles.badge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.badgeText, { color }]}>{item.estado}</Text>
          </View>
        </View>
        <Text style={styles.cliente}>👤 {item.cliente?.nombre}</Text>
        <Text style={styles.fecha}>🗓 {formatFecha(item.fecha_hora)}</Text>
        {item.propiedad?.departamento && (
          <Text style={styles.ubicacion}>📍 {item.propiedad.departamento}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Mis visitas</Text>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#1a56db" /></View>
      ) : (
        <FlatList
          data={visitas}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Sin visitas programadas</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827', padding: 16 },
  list: { paddingHorizontal: 12, paddingBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  propiedad: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827', marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cliente: { fontSize: 13, color: '#374151', marginBottom: 3 },
  fecha: { fontSize: 13, color: '#1a56db', fontWeight: '500', marginBottom: 2 },
  ubicacion: { fontSize: 12, color: '#9ca3af' },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 32 },
});
