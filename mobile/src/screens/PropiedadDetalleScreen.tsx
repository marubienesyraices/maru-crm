import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { apiRequest } from '../lib/api';

interface PropiedadDetalle {
  id: string;
  titulo: string;
  tipo: string;
  estado: string;
  tipo_gestion: string;
  precio_venta?: number;
  precio_renta?: number;
  departamento?: string;
  municipio?: string;
  direccion?: string;
  descripcion?: string;
  area_m2?: number;
  habitaciones?: number;
  banos?: number;
  parqueos?: number;
}

const ESTADO_COLORS: Record<string, string> = {
  DISPONIBLE: '#059669',
  BORRADOR: '#6b7280',
  RESERVADA: '#d97706',
  EN_NEGOCIACION: '#7c3aed',
  VENDIDA: '#1a56db',
  RENTADA: '#0891b2',
};

export default function PropiedadDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [propiedad, setPropiedad] = useState<PropiedadDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<PropiedadDetalle>(`/api/propiedades/${id}`)
      .then(setPropiedad)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  if (error || !propiedad) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'No se encontró la propiedad'}</Text>
      </View>
    );
  }

  const color = ESTADO_COLORS[propiedad.estado] ?? '#6b7280';
  const precio = propiedad.tipo_gestion === 'RENTA' ? propiedad.precio_renta : propiedad.precio_venta;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.titulo}>{propiedad.titulo}</Text>
        <View style={[styles.badge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.badgeText, { color }]}>{propiedad.estado}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Row label="Tipo" value={propiedad.tipo} />
        <Row label="Gestión" value={propiedad.tipo_gestion} />
        {precio != null && (
          <Row label="Precio" value={`Q ${precio.toLocaleString('es-GT')}`} highlight />
        )}
        {propiedad.departamento && (
          <Row label="Ubicación" value={`${propiedad.municipio ?? ''}, ${propiedad.departamento}`} />
        )}
        {propiedad.direccion && <Row label="Dirección" value={propiedad.direccion} />}
      </View>

      {(propiedad.area_m2 != null || propiedad.habitaciones != null ||
        propiedad.banos != null || propiedad.parqueos != null) && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Características</Text>
          {propiedad.area_m2 != null && <Row label="Área" value={`${propiedad.area_m2} m²`} />}
          {propiedad.habitaciones != null && <Row label="Habitaciones" value={String(propiedad.habitaciones)} />}
          {propiedad.banos != null && <Row label="Baños" value={String(propiedad.banos)} />}
          {propiedad.parqueos != null && <Row label="Parqueos" value={String(propiedad.parqueos)} />}
        </View>
      )}

      {propiedad.descripcion && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.descripcion}>{propiedad.descripcion}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 16, gap: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#dc2626', textAlign: 'center', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  titulo: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 10 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  rowLabel: { fontSize: 14, color: '#6b7280' },
  rowValue: { fontSize: 14, color: '#111827', fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  rowValueHighlight: { color: '#1a56db', fontSize: 17, fontWeight: '700' },
  descripcion: { fontSize: 14, color: '#374151', lineHeight: 22 },
});
