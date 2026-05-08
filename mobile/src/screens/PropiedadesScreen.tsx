import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest } from '../lib/api';

interface Propiedad {
  id: string;
  titulo: string;
  tipo: string;
  estado: string;
  tipo_gestion: string;
  precio_venta?: number;
  precio_renta?: number;
  departamento?: string;
  municipio?: string;
}

const ESTADO_COLORS: Record<string, string> = {
  DISPONIBLE: '#059669',
  BORRADOR: '#6b7280',
  RESERVADA: '#d97706',
  EN_NEGOCIACION: '#7c3aed',
  VENDIDA: '#1a56db',
  RENTADA: '#0891b2',
};

export default function PropiedadesScreen() {
  const router = useRouter();
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  async function loadPropiedades(reset = false) {
    const currentPage = reset ? 1 : page;
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '15',
        ...(search ? { search } : {}),
      });
      const data = await apiRequest<{ data: Propiedad[]; total: number }>(
        `/api/propiedades?${params}`,
      );
      const items = data.data ?? [];
      setPropiedades(reset ? items : (prev) => [...prev, ...items]);
      setHasMore(items.length === 15);
      if (!reset) setPage(currentPage + 1);
    } catch (err) {
      console.warn('Error cargando propiedades:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadPropiedades(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    loadPropiedades(true);
  }, [search]);

  function renderItem({ item }: { item: Propiedad }) {
    const color = ESTADO_COLORS[item.estado] ?? '#6b7280';
    const precio = item.tipo_gestion === 'RENTA' ? item.precio_renta : item.precio_venta;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/propiedad/[id]', params: { id: item.id } })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.titulo} numberOfLines={1}>{item.titulo}</Text>
          <View style={[styles.badge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.badgeText, { color }]}>{item.estado}</Text>
          </View>
        </View>
        <Text style={styles.tipo}>{item.tipo} · {item.tipo_gestion}</Text>
        {precio && (
          <Text style={styles.precio}>Q {precio.toLocaleString('es-GT')}</Text>
        )}
        {item.departamento && (
          <Text style={styles.ubicacion}>📍 {item.municipio}, {item.departamento}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar propiedades..."
        placeholderTextColor="#9ca3af"
        value={search}
        onChangeText={(t) => { setSearch(t); setPage(1); }}
        onSubmitEditing={() => { setLoading(true); loadPropiedades(true); }}
        returnKeyType="search"
      />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1a56db" />
        </View>
      ) : (
        <FlatList
          data={propiedades}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={() => hasMore && loadPropiedades()}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Sin propiedades</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchInput: {
    margin: 12, padding: 12, backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb', fontSize: 15, color: '#111827',
  },
  list: { paddingHorizontal: 12, paddingBottom: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  titulo: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827', marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  tipo: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  precio: { fontSize: 16, fontWeight: '700', color: '#1a56db', marginBottom: 2 },
  ubicacion: { fontSize: 12, color: '#9ca3af' },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 32 },
});
