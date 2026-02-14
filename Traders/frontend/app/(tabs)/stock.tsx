import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { stockAPI } from '../../services/api';
import Card from '../../components/Card';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PartyBreakdown {
  party_name: string;
  buy_packs: number;
  buy_value: number;
  buy_loaded_packs: number;
  buy_loaded_value: number;
  avg_buy_rate: number;
  sell_packs: number;
  sell_value: number;
  sell_loaded_packs: number;
  sell_loaded_value: number;
  avg_sell_rate: number;
  net_packs: number;
  net_value: number;
  pending_buy_packs: number;
  pending_sell_packs: number;
}

interface StockItemWithBreakdown {
  id: number;
  item_id: number;
  ex_plant_id: number;
  item_name: string;
  nick_name?: string;
  ex_plant_name: string;
  total_purchase_packs: number;
  total_sell_packs: number;
  loaded_purchase_packs: number;
  loaded_sell_packs: number;
  current_stock_packs: number;
  pending_purchase_loading: number;
  pending_sell_loading: number;
  party_breakdown: PartyBreakdown[];
}

interface StockSummary {
  total_purchase: number;
  total_sell: number;
  net_purchase: number;
  pending_purchase_loading: number;
  pending_sell_loading: number;
}

export default function StockScreen() {
  const [stockData, setStockData] = useState<StockItemWithBreakdown[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [includeZero, setIncludeZero] = useState(true);
  const [showAverageRates, setShowAverageRates] = useState(false);


  const fetchStockData = async () => {
    try {
      const status = includeZero ? undefined : 'pending';
      const [stockResponse, summaryResponse] = await Promise.all([
        stockAPI.getPartyBreakdown({ status }),
        stockAPI.getSummary()
      ]);
      setStockData(stockResponse.data);
      setSummary(summaryResponse.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load stock data');
      console.error('Stock error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRecalculateStock = async () => {
    try {
      await stockAPI.recalculateAll();
      fetchStockData();
      Alert.alert('Success', 'Stock table recalculated.');
    } catch (error) {
      Alert.alert('Error', 'Failed to recalculate stock.');
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchStockData();
    }, [includeZero])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStockData();
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };



  const calculateGrandTotals = () => {
    const totals = {
      total_buy: 0,
      total_net_buy: 0,
      total_sell: 0,
    };

    stockData.forEach(item => {
      totals.total_buy += item.total_purchase_packs;
      totals.total_sell += item.total_sell_packs;
      // Net buy = pending purchase - pending sell (after loading)
      const pending_purchase = item.total_purchase_packs - item.loaded_purchase_packs;
      const pending_sell = item.total_sell_packs - item.loaded_sell_packs;
      totals.total_net_buy += (pending_purchase - pending_sell);
    });

    return totals;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading stock data...</Text>
      </SafeAreaView>
    );
  }

  const grandTotals = calculateGrandTotals();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Stock Report</Text>
        </View>

        {/* Admin Utility: Recalculate Stock Button */}
        <View style={{ alignItems: 'flex-end', padding: 16 }}>
          <TouchableOpacity onPress={handleRecalculateStock} style={styles.recalcButton}>
            <Ionicons name="refresh" size={18} color="#0F4C75" />
            <Text style={styles.recalcButtonText}>Recalculate Stock</Text>
          </TouchableOpacity>
        </View>

        {/* Toggle Switches */}
        <View style={styles.toggleSection}>
          <Card>
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>
                {includeZero ? 'With 0' : 'Without 0'}
              </Text>
              <Switch
                value={includeZero}
                onValueChange={setIncludeZero}
                trackColor={{ false: '#D1D5DB', true: '#0F4C75' }}
                thumbColor={includeZero ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
          </Card>
        </View>

        <View style={styles.toggleSection}>
          <Card>
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>
                {showAverageRates ? 'With Average Rates' : 'Without Average Rates'}
              </Text>
              <Switch
                value={showAverageRates}
                onValueChange={setShowAverageRates}
                trackColor={{ false: '#D1D5DB', true: '#0F4C75' }}
                thumbColor={showAverageRates ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
          </Card>
        </View>

        {/* Grand Total Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Grand Total</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Buy</Text>
              <Text style={styles.summaryValue}>
                {formatNumber(grandTotals.total_buy)}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Net Buy</Text>
              <Text style={[
                styles.summaryValue,
                { color: grandTotals.total_net_buy >= 0 ? '#2ECC71' : '#E74C3C' }
              ]}>
                {formatNumber(grandTotals.total_net_buy)}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Sell</Text>
              <Text style={styles.summaryValue}>
                {formatNumber(grandTotals.total_sell)}
              </Text>
            </View>
          </View>
        </View>

        {/* Pending Loading Section */}
        <View style={styles.pendingSection}>
          <Text style={styles.sectionTitle}>Pending Loading</Text>
          <View style={styles.pendingGrid}>
            <Card style={styles.pendingCard}>
              <View style={styles.pendingHeader}>
                <Ionicons name="time" size={24} color="#F39C12" />
                <Text style={styles.pendingLabel}>Pending Purchase Loading</Text>
              </View>
              <Text style={styles.pendingValue}>
                {formatNumber(summary?.pending_purchase_loading || 0)}
              </Text>
            </Card>

            <Card style={styles.pendingCard}>
              <View style={styles.pendingHeader}>
                <Ionicons 
                  name={((summary?.pending_purchase_loading || 0) - (summary?.pending_sell_loading || 0)) >= 0 ? "trending-up" : "trending-down"} 
                  size={24} 
                  color={((summary?.pending_purchase_loading || 0) - (summary?.pending_sell_loading || 0)) >= 0 ? "#2ECC71" : "#E74C3C"} 
                />
                <Text style={styles.pendingLabel}>Net Loading</Text>
              </View>
              <Text style={[
                styles.pendingValue,
                { color: ((summary?.pending_purchase_loading || 0) - (summary?.pending_sell_loading || 0)) >= 0 ? '#2ECC71' : '#E74C3C' }
              ]}>
                {formatNumber((summary?.pending_purchase_loading || 0) - (summary?.pending_sell_loading || 0))}
              </Text>
            </Card>

            <Card style={styles.pendingCard}>
              <View style={styles.pendingHeader}>
                <Ionicons name="time" size={24} color="#E67E22" />
                <Text style={styles.pendingLabel}>Pending Sell Loading</Text>
              </View>
              <Text style={styles.pendingValue}>
                {formatNumber(summary?.pending_sell_loading || 0)}
              </Text>
            </Card>
          </View>
        </View>

        {/* Stock Details by Ex-Plant */}
        <View style={styles.stockSection}>
          <Text style={styles.sectionTitle}>Stock Details</Text>
          <View style={styles.stockGrid}>
            {(() => {
              // Group by item_id only
              const itemsMap = new Map<number, {
                item_id: number;
                item_name: string;
                nick_name?: string;
                total_purchase_packs: number;
                total_sell_packs: number;
                loaded_purchase_packs: number;
                loaded_sell_packs: number;
                pending_purchase_loading: number;
                pending_sell_loading: number;
              }>();

              stockData.forEach((item) => {
                const existing = itemsMap.get(item.item_id);
                if (existing) {
                  existing.total_purchase_packs += item.total_purchase_packs;
                  existing.total_sell_packs += item.total_sell_packs;
                  existing.loaded_purchase_packs += item.loaded_purchase_packs;
                  existing.loaded_sell_packs += item.loaded_sell_packs;
                  existing.pending_purchase_loading += item.pending_purchase_loading;
                  existing.pending_sell_loading += item.pending_sell_loading;
                } else {
                  itemsMap.set(item.item_id, {
                    item_id: item.item_id,
                    item_name: item.item_name,
                    nick_name: item.nick_name,
                    total_purchase_packs: item.total_purchase_packs,
                    total_sell_packs: item.total_sell_packs,
                    loaded_purchase_packs: item.loaded_purchase_packs,
                    loaded_sell_packs: item.loaded_sell_packs,
                    pending_purchase_loading: item.pending_purchase_loading,
                    pending_sell_loading: item.pending_sell_loading,
                  });
                }
              });

              return Array.from(itemsMap.values()).map((item) => {
                const pending_purchase = item.total_purchase_packs - item.loaded_purchase_packs;
                const pending_sell = item.total_sell_packs - item.loaded_sell_packs;
                const itemTotals = {
                  buy: item.total_purchase_packs,
                  net_buy: pending_purchase - pending_sell,
                  sell: item.total_sell_packs,
                };

                return (
                  <Card key={item.item_id} style={styles.stockCard}>
                    <TouchableOpacity
                      style={styles.stockHeader}
                      onPress={() => router.push({
                        pathname: '/item-plants',
                        params: {
                          itemId: item.item_id.toString(),
                          itemName: item.nick_name || item.item_name,
                          showAverageRates: showAverageRates.toString()
                        }
                      })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.stockInfo}>
                        <Text style={styles.stockName}>
                          {item.nick_name || item.item_name}
                        </Text>
                      </View>
                      <View style={styles.stockTotals}>
                        <View style={styles.totalRow}>
                          <Text style={styles.totalLabel}>Net Buy:</Text>
                          <Text style={[
                            styles.totalValue,
                            { color: itemTotals.net_buy >= 0 ? '#2ECC71' : '#E74C3C' }
                          ]}>
                            {formatNumber(itemTotals.net_buy)}
                          </Text>
                        </View>
                      </View>
                      <Ionicons 
                        name="chevron-forward" 
                        size={24} 
                        color="#6B7280" 
                      />
                    </TouchableOpacity>
                  </Card>
                );
              });
            })()}
          </View>
        </View>

        {stockData.length === 0 && (
          <View style={styles.emptySection}>
            <Card>
              <View style={styles.emptyContent}>
                <Ionicons name="cube-outline" size={48} color="#6B7280" />
                <Text style={styles.emptyText}>
                  {includeZero ? 'No stock data available' : 'No stock with quantity > 0'}
                </Text>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  toggleSection: {
    padding: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  summarySection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  stockSection: {
    padding: 16,
    paddingBottom: 32,
  },
  stockGrid: {
    gap: 16,
  },
  stockCard: {
    padding: 0,
  },
  stockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  stockTotals: {
    marginRight: 16,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },

  pendingSection: {
    padding: 16,
  },
  pendingGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  pendingCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  pendingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  emptySection: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  recalcButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 10,
    marginBottom: 10,
  },
  recalcButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F4C75',
  },
}); 