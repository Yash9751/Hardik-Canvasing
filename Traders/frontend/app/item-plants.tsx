import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { stockAPI } from '../services/api';
import Card from '../components/Card';
import { SafeAreaView } from 'react-native-safe-area-context';

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
}

export default function ItemPlantsScreen() {
  const params = useLocalSearchParams();
  const { itemId, itemName, showAverageRates } = params;
  
  const [plantsData, setPlantsData] = useState<StockItemWithBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRates, setShowRates] = useState(showAverageRates === 'true');

  useEffect(() => {
    fetchPlantsData();
  }, []);

  const fetchPlantsData = async () => {
    try {
      setLoading(true);
      const response = await stockAPI.getPartyBreakdown({ 
        status: undefined
      });
      
      // Filter for the specific item and group by ex_plant
      const itemData = response.data.filter(
        (item: any) => item.item_id === Number(itemId)
      );
      
      setPlantsData(itemData);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load plant breakdown data');
      console.error('Plant breakdown error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{itemName}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.showRatesLabel}>Show Rates</Text>
          <Switch
            value={showRates}
            onValueChange={setShowRates}
            trackColor={{ false: '#E5E7EB', true: '#0F4C75' }}
            thumbColor={showRates ? '#FFFFFF' : '#F3F4F6'}
          />
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.plantsSection}>
          <Text style={styles.sectionTitle}>Plants</Text>
          <View style={styles.plantsGrid}>
            {plantsData.map((plant) => {
              const pending_purchase = plant.total_purchase_packs - plant.loaded_purchase_packs;
              const pending_sell = plant.total_sell_packs - plant.loaded_sell_packs;
              const plantTotals = {
                buy: plant.total_purchase_packs,
                net_buy: pending_purchase - pending_sell,
                sell: plant.total_sell_packs,
              };

              return (
                <Card key={plant.ex_plant_id} style={styles.plantCard}>
                  <TouchableOpacity
                    style={styles.plantHeader}
                    onPress={() => router.push({
                      pathname: '/party-stock-details',
                      params: {
                        itemId: plant.item_id.toString(),
                        itemName: plant.nick_name || plant.item_name,
                        exPlantId: plant.ex_plant_id.toString(),
                        exPlantName: plant.ex_plant_name,
                        showAverageRates: showRates.toString()
                      }
                    })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.plantInfo}>
                      <Text style={styles.plantName}>
                        {plant.ex_plant_name}
                      </Text>
                    </View>
                    <View style={styles.plantTotals}>
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Net Buy:</Text>
                        <Text style={[
                          styles.totalValue,
                          { color: plantTotals.net_buy >= 0 ? '#2ECC71' : '#E74C3C' }
                        ]}>
                          {formatNumber(plantTotals.net_buy)}
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
            })}
          </View>
        </View>
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
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  showRatesLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  plantsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  plantsGrid: {
    gap: 12,
  },
  plantCard: {
    padding: 0,
    overflow: 'hidden',
  },
  plantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  plantInfo: {
    flex: 1,
  },
  plantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  plantTotals: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

