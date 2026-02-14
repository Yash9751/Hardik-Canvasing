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



export default function PartyStockDetailsScreen() {
  const params = useLocalSearchParams();
  const { itemId, itemName, exPlantId, exPlantName, showAverageRates } = params;
  
  const [partyBreakdown, setPartyBreakdown] = useState<PartyBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRates, setShowRates] = useState(showAverageRates === 'true');

  useEffect(() => {
    fetchPartyBreakdown();
  }, []);

  const fetchPartyBreakdown = async () => {
    try {
      setLoading(true);
      const response = await stockAPI.getPartyBreakdown({ 
        status: undefined
      });
      
      // Find the specific item/ex-plant combination
      const itemData = response.data.find(
        (item: any) => item.item_id === Number(itemId) && item.ex_plant_id === Number(exPlantId)
      );
      
      if (itemData) {
        setPartyBreakdown(itemData.party_breakdown || []);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load party breakdown data');
      console.error('Party breakdown error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };





  const calculatePurchaseTotals = () => {
    const purchaseParties = partyBreakdown.filter(party => party.pending_buy_packs > 0);
    const totals = purchaseParties.reduce((acc: any, party: PartyBreakdown) => {
      acc.totalPacks += party.pending_buy_packs;
      acc.totalValue += party.buy_value - party.buy_loaded_value; // Pending value
      acc.totalRate += party.avg_buy_rate * party.pending_buy_packs;
      return acc;
    }, { totalPacks: 0, totalValue: 0, totalRate: 0 });
    
    return {
      totalPacks: totals.totalPacks,
      totalValue: totals.totalValue,
      avgRate: totals.totalPacks > 0 ? totals.totalRate / totals.totalPacks : 0
    };
  };

  const calculateSellTotals = () => {
    const sellParties = partyBreakdown.filter(party => party.pending_sell_packs > 0);
    const totals = sellParties.reduce((acc: any, party: PartyBreakdown) => {
      acc.totalPacks += party.pending_sell_packs;
      acc.totalValue += party.sell_value - party.sell_loaded_value; // Pending value
      acc.totalRate += party.avg_sell_rate * party.pending_sell_packs;
      return acc;
    }, { totalPacks: 0, totalValue: 0, totalRate: 0 });
    
    return {
      totalPacks: totals.totalPacks,
      totalValue: totals.totalValue,
      avgRate: totals.totalPacks > 0 ? totals.totalRate / totals.totalPacks : 0
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading party details...</Text>
      </SafeAreaView>
    );
  }

  const purchaseParties = partyBreakdown.filter(party => party.pending_buy_packs > 0);
  const sellParties = partyBreakdown.filter(party => party.pending_sell_packs > 0);
  const purchaseTotals = calculatePurchaseTotals();
  const sellTotals = calculateSellTotals();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {itemName} - {exPlantName}
          </Text>
        </View>

        {/* Average Rates Toggle */}
        <View style={styles.selectionSection}>
          <Card>
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Show Average Rates</Text>
              <Switch
                value={showRates}
                onValueChange={setShowRates}
                trackColor={{ false: '#D1D5DB', true: '#0F4C75' }}
                thumbColor={showRates ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
          </Card>
        </View>

        {/* Summary Section */}
        <View style={styles.summarySection}>
          <View style={styles.summaryGrid}>
            {/* Purchase Summary */}
            <TouchableOpacity 
              style={styles.summaryCard}
              onPress={() => router.push({
                pathname: '/purchase-parties',
                params: {
                  itemId: itemId.toString(),
                  itemName: itemName.toString(),
                  exPlantId: exPlantId.toString(),
                  exPlantName: exPlantName.toString()
                }
              })}
              activeOpacity={0.7}
            >
              <Card>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryTitle}>Purchase Summary</Text>
                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </View>
                <View style={styles.summaryContent}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Packs:</Text>
                    <Text style={styles.summaryValue}>
                      {formatNumber(purchaseTotals.totalPacks)} MT
                    </Text>
                  </View>
                  {showRates && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Avg Rate:</Text>
                      <Text style={styles.summaryValue}>
                        ₹{formatNumber(purchaseTotals.avgRate)}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            </TouchableOpacity>

            {/* Sell Summary */}
            <TouchableOpacity 
              style={styles.summaryCard}
              onPress={() => router.push({
                pathname: '/sell-parties',
                params: {
                  itemId: itemId.toString(),
                  itemName: itemName.toString(),
                  exPlantId: exPlantId.toString(),
                  exPlantName: exPlantName.toString()
                }
              })}
              activeOpacity={0.7}
            >
              <Card>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryTitle}>Sell Summary</Text>
                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </View>
                <View style={styles.summaryContent}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Packs:</Text>
                    <Text style={styles.summaryValue}>
                      {formatNumber(sellTotals.totalPacks)} MT
                    </Text>
                  </View>
                  {showRates && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Avg Rate:</Text>
                      <Text style={styles.summaryValue}>
                        ₹{formatNumber(sellTotals.avgRate)}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
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
    backgroundColor: '#F7F9FC',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  selectionSection: {
    padding: 16,
  },
  selectionContainer: {
    flexDirection: 'row',
    gap: 12,
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
  selectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  selectedButton: {
    backgroundColor: '#0F4C75',
    borderColor: '#0F4C75',
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  summarySection: {
    padding: 16,
  },
  summaryGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  summaryCard: {
    width: '100%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryHeader: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  summaryContent: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },

}); 