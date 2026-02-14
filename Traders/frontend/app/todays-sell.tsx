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

interface SellData {
  id: number;
  sauda_number: string;
  party_name: string;
  item_name: string;
  quantity: string | number;
  rate: string | number;
  total_value: string | number;
  ex_plant_name?: string;
  created_at: string;
  loading_quantity?: string | number;
  loading_rate?: string | number;
  loading_total?: string | number;
}

export default function TodaysSell() {
  const router = useRouter();
  const [sells, setSells] = useState<SellData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTodaysSell = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboard/todays-sell-details');
      const sellsData = response.data.sells || [];
      setSells(sellsData);
    } catch (error: any) {
      console.error('Error fetching today\'s sell:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to fetch today\'s sell data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTodaysSell();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchTodaysSell();
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
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#0F4C75" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Today's Sell</ThemedText>
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


          {/* Sell List */}
          <View style={styles.listContainer}>
            <ThemedText style={styles.listTitle}>Sell Details ({sells.length})</ThemedText>
            
            {loading ? (
              <Card style={styles.loadingCard}>
                <ThemedText style={styles.loadingText}>Loading...</ThemedText>
              </Card>
            ) : sells.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="document-outline" size={48} color="#9CA3AF" />
                <ThemedText style={styles.emptyText}>No sells found for today</ThemedText>
              </Card>
            ) : (
              sells.map((sell, index) => (
                <Card key={sell.id} style={styles.sellItemCard}>
                  <View style={styles.sellHeader}>
                                          <TouchableOpacity 
                        onPress={() => router.push(`/view-sauda?id=${sell.id}`)}
                        style={styles.saudaNumberContainer}
                      >
                      <ThemedText style={styles.saudaNumber}>
                        #{sell.sauda_number}
                      </ThemedText>
                    </TouchableOpacity>
                    <ThemedText style={styles.dateText}>{formatDate(sell.created_at)}</ThemedText>
                  </View>
                  
                  <View style={styles.sellDetails}>
                    <View style={styles.detailRow}>
                      <ThemedText style={styles.detailLabel}>Party:</ThemedText>
                      <ThemedText style={styles.detailValue}>{sell.party_name}</ThemedText>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <ThemedText style={styles.detailLabel}>Item:</ThemedText>
                      <ThemedText style={styles.detailValue}>{sell.item_name}</ThemedText>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <ThemedText style={styles.detailLabel}>Quantity:</ThemedText>
                      <ThemedText style={styles.detailValue}>{ensureNumber(sell.quantity).toFixed(2)} MT</ThemedText>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <ThemedText style={styles.detailLabel}>Rate:</ThemedText>
                      <ThemedText style={styles.detailValue}>₹{ensureNumber(sell.rate)}/10kg</ThemedText>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <ThemedText style={styles.detailLabel}>Ex-Plant:</ThemedText>
                      <ThemedText style={styles.detailValue}>{sell.ex_plant_name || 'N/A'}</ThemedText>
                    </View>
                    
                    {sell.loading_quantity && (
                      <View style={styles.detailRow}>
                        <ThemedText style={styles.detailLabel}>Loading Qty:</ThemedText>
                        <ThemedText style={styles.detailValue}>{ensureNumber(sell.loading_quantity).toFixed(2)} MT</ThemedText>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={() => router.push(`/view-sauda?id=${sell.id}`)}
                    >
                      <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.viewButtonText}>View Sauda</Text>
                    </TouchableOpacity>
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
  sellItemCard: {
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
  sellHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  saudaNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  sellDetails: {
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
  loadingSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  actionButtonsContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 4,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F4C75',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
    shadowColor: '#0F4C75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
}); 