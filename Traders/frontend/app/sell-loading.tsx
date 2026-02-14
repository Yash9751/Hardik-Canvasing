import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import Card from '../components/Card';
import Button from '../components/Button';
import api from '../services/api';

interface LoadingData {
  id: number;
  sauda_number: string;
  party_name: string;
  item_name: string;
  quantity: string | number;
  rate: string | number;
  total_value: string | number;
  created_at: string;
  loading_type: string;
  remarks?: string;
}

export default function SellLoading() {
  const router = useRouter();
  const [loadings, setLoadings] = useState<LoadingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    totalQuantity: 0,
    totalValue: 0,
    averageRate: 0,
    totalEntries: 0,
  });

  const fetchSellLoading = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboard/sell-loading-details');
      const loadingsData = response.data.loadings || [];
      setLoadings(loadingsData);
      
      // Calculate summary with proper type conversion
      const totalQty = loadingsData.reduce((sum: number, l: LoadingData) => {
        const qty = parseFloat(l.quantity?.toString() || '0');
        return sum + qty;
      }, 0);
      
      const totalVal = loadingsData.reduce((sum: number, l: LoadingData) => {
        const val = parseFloat(l.total_value?.toString() || '0');
        return sum + val;
      }, 0);
      
      const avgRate = totalQty > 0 ? totalVal / totalQty : 0;

      setSummary({
        totalQuantity: totalQty,
        totalValue: totalVal,
        averageRate: avgRate,
        totalEntries: loadingsData.length,
      });
    } catch (error: any) {
      console.error('Error fetching sell loading:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to fetch sell loading data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSellLoading();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchSellLoading();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const ensureNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    return 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#0F4C75" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Sell Loading</ThemedText>
          <TouchableOpacity
            onPress={onRefresh}
            style={styles.refreshButton}
          >
            <Ionicons name="refresh" size={24} color="#0F4C75" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Summary Cards */}
          <View style={styles.summaryContainer}>
            <Card style={styles.summaryCard}>
              <ThemedText style={styles.summaryTitle}>Loading Summary</ThemedText>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Total Quantity:</ThemedText>
                <ThemedText style={styles.summaryValue}>{ensureNumber(summary?.totalQuantity).toFixed(2)} MT</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Total Value:</ThemedText>
                <ThemedText style={styles.summaryValue}>{formatCurrency(ensureNumber(summary?.totalValue))}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Average Rate:</ThemedText>
                <ThemedText style={styles.summaryValue}>{formatCurrency(ensureNumber(summary?.averageRate))}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Total Entries:</ThemedText>
                <ThemedText style={styles.summaryValue}>{ensureNumber(summary?.totalEntries)}</ThemedText>
              </View>
            </Card>
          </View>

          {/* Loading List */}
          <View style={styles.listContainer}>
            <ThemedText style={styles.listTitle}>Loading Details ({loadings.length})</ThemedText>
            
            {loading ? (
              <Card style={styles.loadingCard}>
                <ThemedText style={styles.loadingText}>Loading...</ThemedText>
              </Card>
            ) : loadings.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="car-outline" size={48} color="#9CA3AF" />
                <ThemedText style={styles.emptyText}>No sell loading found</ThemedText>
              </Card>
            ) : (
              loadings.map((loadingItem, index) => (
                <Card key={loadingItem.id} style={styles.loadingItemCard}>
                  <View style={styles.loadingHeader}>
                    <ThemedText style={styles.saudaNumber}>#{loadingItem.sauda_number}</ThemedText>
                    <ThemedText style={styles.dateText}>{formatDate(loadingItem.created_at)}</ThemedText>
                  </View>
                  
                  <View style={styles.loadingDetails}>
                    <View style={styles.detailRow}>
                      <ThemedText style={styles.detailLabel}>Party:</ThemedText>
                      <ThemedText style={styles.detailValue}>{loadingItem.party_name}</ThemedText>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <ThemedText style={styles.detailLabel}>Item:</ThemedText>
                      <ThemedText style={styles.detailValue}>{loadingItem.item_name}</ThemedText>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <ThemedText style={styles.detailLabel}>Quantity:</ThemedText>
                      <ThemedText style={styles.detailValue}>{ensureNumber(loadingItem.quantity).toFixed(2)} MT</ThemedText>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <ThemedText style={styles.detailLabel}>Rate:</ThemedText>
                      <ThemedText style={styles.detailValue}>₹{ensureNumber(loadingItem.rate)}/10kg</ThemedText>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <ThemedText style={styles.detailLabel}>Total Value:</ThemedText>
                      <ThemedText style={styles.detailValue}>{formatCurrency(ensureNumber(loadingItem.total_value))}</ThemedText>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <ThemedText style={styles.detailLabel}>Loading Type:</ThemedText>
                      <ThemedText style={styles.detailValue}>{loadingItem.loading_type}</ThemedText>
                    </View>
                    
                    {loadingItem.remarks && (
                      <View style={styles.detailRow}>
                        <ThemedText style={styles.detailLabel}>Remarks:</ThemedText>
                        <ThemedText style={styles.detailValue}>{loadingItem.remarks}</ThemedText>
                      </View>
                    )}
                  </View>
                </Card>
              ))
            )}
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  scrollView: {
    flex: 1,
  },
  summaryContainer: {
    padding: 16,
    gap: 16,
  },
  summaryCard: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F4C75',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  listContainer: {
    padding: 16,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  loadingCard: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 12,
    fontWeight: '500',
  },
  loadingItemCard: {
    marginBottom: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  loadingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  saudaNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F4C75',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  loadingDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '700',
  },
}); 