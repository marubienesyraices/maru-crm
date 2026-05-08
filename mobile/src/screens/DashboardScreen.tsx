import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { apiRequest } from '../lib/api';

interface KpiData {
  totalPropiedades: number;
  propiedadesDisponibles: number;
  tramitesActivos: number;
  visitasHoy: number;
  ganados: number;
}

interface Notificacion {
  id: string;
  tipo: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
}

export default function DashboardScreen() {
  const { user, logout } = useAuthStore();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const [biData, notifData] = await Promise.all([
        apiRequest<{ resumen: KpiData }>('/api/bi/resumen'),
        apiRequest<Notificacion[]>('/api/notificaciones?limit=5'),
      ]);
      setKpis(biData.resumen);
      setNotifs(Array.isArray(notifData) ? notifData : []);
    } catch (err) {
      console.warn('Error cargando dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.nombre?.split(' ')[0]} 👋</Text>
          <Text style={styles.role}>{user?.rol}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* KPIs */}
      <View style={styles.kpisGrid}>
        <KpiCard label="Propiedades" value={kpis?.totalPropiedades ?? 0} color="#1a56db" />
        <KpiCard label="Disponibles" value={kpis?.propiedadesDisponibles ?? 0} color="#059669" />
        <KpiCard label="Trámites activos" value={kpis?.tramitesActivos ?? 0} color="#d97706" />
        <KpiCard label="Visitas hoy" value={kpis?.visitasHoy ?? 0} color="#7c3aed" />
      </View>

      {/* Notificaciones recientes */}
      <Text style={styles.sectionTitle}>Notificaciones recientes</Text>
      {notifs.length === 0 ? (
        <Text style={styles.empty}>Sin notificaciones pendientes</Text>
      ) : (
        notifs.map((n) => (
          <View key={n.id} style={[styles.notifCard, !n.leida && styles.notifUnread]}>
            <Text style={styles.notifMensaje}>{n.mensaje}</Text>
            <Text style={styles.notifFecha}>
              {new Date(n.createdAt).toLocaleString('es-GT', { timeZone: 'America/Guatemala' })}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  greeting: { fontSize: 20, fontWeight: '700', color: '#111827' },
  role: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  logoutBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fee2e2', borderRadius: 8 },
  logoutText: { color: '#dc2626', fontWeight: '600', fontSize: 14 },
  kpisGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  kpiCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12,
    padding: 16, borderLeftWidth: 4, elevation: 2,
  },
  kpiValue: { fontSize: 28, fontWeight: '800' },
  kpiLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  empty: { color: '#9ca3af', textAlign: 'center', padding: 24 },
  notifCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 10, padding: 14, elevation: 1,
  },
  notifUnread: { borderLeftWidth: 3, borderLeftColor: '#1a56db' },
  notifMensaje: { fontSize: 14, color: '#374151' },
  notifFecha: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
});
