import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { plusMinusAPI } from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';

import { SafeAreaView } from 'react-native-safe-area-context';

interface PlusMinusData {
  date: string;
  products: Array<{
    product_type: string;
    buy_total: number;
    sell_total: number;
    profit: number;
    buy_quantity: number;
    sell_quantity: number;
    avg_buy_rate: number;
    avg_sell_rate: number;
  }>;
  totals: {
    totalBuy: number;
    totalSell: number;
    totalProfit: number;
    totalBuyQuantity: number;
    totalSellQuantity: number;
    avgBuyRate: number;
    avgSellRate: number;
  };
}

interface FuturePlusMinusData {
  products: Array<{
    product_type: string;
    buy_total: number;
    sell_total: number;
    profit: number;
    buy_quantity: number;
    sell_quantity: number;
    avg_buy_rate: number;
    avg_sell_rate: number;
  }>;
  totals: {
    totalBuy: number;
    totalSell: number;
    totalProfit: number;
    totalBuyQuantity: number;
    totalSellQuantity: number;
    avgBuyRate: number;
    avgSellRate: number;
  };
}

export default function PlusMinusScreen() {
  const [allTradesData, setAllTradesData] = useState<PlusMinusData | null>(null);
  const [futureData, setFutureData] = useState<FuturePlusMinusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateInput, setDateInput] = useState(selectedDate);

  const fetchData = async (date?: string) => {
    try {
      const targetDate = date || selectedDate;
      
      // Fetch all trades data
      let allTradesResponse = await plusMinusAPI.getAll({ date: targetDate });
      
      // If no data exists for this date, automatically generate it
      if (!allTradesResponse.data || allTradesResponse.data.length === 0) {
        console.log('No P&L data found for date:', targetDate, '- generating automatically');
        await plusMinusAPI.generate({ date: targetDate });
        allTradesResponse = await plusMinusAPI.getAll({ date: targetDate });
      }
      
      // Transform the all trades array to the expected structure
      const allTradesRows = allTradesResponse.data;
      if (Array.isArray(allTradesRows)) {
        const allTradesProducts = allTradesRows.map(row => ({
          product_type: row.item_name,
          buy_total: parseFloat(row.buy_total),
          sell_total: parseFloat(row.sell_total),
          profit: parseFloat(row.profit),
          buy_quantity: parseFloat(row.buy_quantity || 0),
          sell_quantity: parseFloat(row.sell_quantity || 0),
          avg_buy_rate: parseFloat(row.avg_buy_rate || 0),
          avg_sell_rate: parseFloat(row.avg_sell_rate || 0)
        }));
        const allTradesTotals = {
          totalBuy: allTradesProducts.reduce((sum, p) => sum + p.buy_total, 0),
          totalSell: allTradesProducts.reduce((sum, p) => sum + p.sell_total, 0),
          totalProfit: allTradesProducts.reduce((sum, p) => sum + p.profit, 0),
          totalBuyQuantity: allTradesProducts.reduce((sum, p) => sum + p.buy_quantity, 0),
          totalSellQuantity: allTradesProducts.reduce((sum, p) => sum + (p.sell_quantity / 1000), 0), // Convert kg to MT
          avgBuyRate: allTradesProducts.reduce((sum, p) => sum + (p.avg_buy_rate * p.buy_quantity), 0) / Math.max(allTradesProducts.reduce((sum, p) => sum + p.buy_quantity, 0), 1),
          avgSellRate: allTradesProducts.reduce((sum, p) => sum + (p.avg_sell_rate * (p.sell_quantity / 1000)), 0) / Math.max(allTradesProducts.reduce((sum, p) => sum + (p.sell_quantity / 1000), 0), 1)
        };
        setAllTradesData({
          date: targetDate,
          products: allTradesProducts,
          totals: allTradesTotals
        });
      }

      // Fetch future P&L data
      try {
        const futureResponse = await plusMinusAPI.getFuture();
        const futureRows = futureResponse.data;
        if (Array.isArray(futureRows)) {
          const futureProducts = futureRows.map(row => ({
            product_type: row.product_type || row.item_name,
            buy_total: parseFloat(row.buy_total),
            sell_total: parseFloat(row.sell_total),
            profit: parseFloat(row.profit),
            buy_quantity: parseFloat(row.buy_quantity || 0),
            sell_quantity: parseFloat(row.sell_quantity || 0),
            avg_buy_rate: parseFloat(row.avg_buy_rate || 0),
            avg_sell_rate: parseFloat(row.avg_sell_rate || 0)
          }));
          const futureTotals = {
            totalBuy: futureProducts.reduce((sum, p) => sum + p.buy_total, 0),
            totalSell: futureProducts.reduce((sum, p) => sum + p.sell_total, 0),
            totalProfit: futureProducts.reduce((sum, p) => sum + p.profit, 0),
            totalBuyQuantity: futureProducts.reduce((sum, p) => sum + p.buy_quantity, 0),
            totalSellQuantity: futureProducts.reduce((sum, p) => sum + (p.sell_quantity / 1000), 0), // Convert kg to MT
            avgBuyRate: futureProducts.reduce((sum, p) => sum + (p.avg_buy_rate * p.buy_quantity), 0) / Math.max(futureProducts.reduce((sum, p) => sum + p.buy_quantity, 0), 1),
            avgSellRate: futureProducts.reduce((sum, p) => sum + (p.avg_sell_rate * (p.sell_quantity / 1000)), 0) / Math.max(futureProducts.reduce((sum, p) => sum + (p.sell_quantity / 1000), 0), 1)
          };
          setFutureData({
            products: futureProducts,
            totals: futureTotals
          });
        }
      } catch (futureError) {
        console.log('No future P&L data available:', futureError);
        setFutureData({
          products: [],
          totals: {
            totalBuy: 0,
            totalSell: 0,
            totalProfit: 0,
            totalBuyQuantity: 0,
            totalSellQuantity: 0,
            avgBuyRate: 0,
            avgSellRate: 0
          }
        });
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load P&L data');
      console.error('Plus minus error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [selectedDate])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const generateReport = async () => {
    try {
      await plusMinusAPI.generate({ date: selectedDate });
      Alert.alert('Success', 'P&L report generated successfully');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to generate P&L report');
    }
  };

  const handleDateChange = () => {
    setSelectedDate(dateInput);
    setShowDateModal(false);
    fetchData(dateInput);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getProfitPercentage = (buy: number, sell: number) => {
    if (buy === 0) return sell > 0 ? 100 : 0;
    return ((sell - buy) / buy) * 100;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading P&L data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profit & Loss</Text>
        </View>

        {/* Date Selection */}
        <View style={styles.dateSection}>
          <Card>
            <View style={styles.dateContainer}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDateModal(true)}
              >
                <Ionicons name="calendar" size={20} color="#0F4C75" />
                <Text style={styles.dateText}>
                  {formatDate(selectedDate)}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>
              <Button
                title="Generate Report"
                onPress={generateReport}
                variant="secondary"
                size="small"
              />
            </View>
          </Card>
        </View>

        {/* All Trades Summary */}
        {allTradesData?.totals && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>All Trades Summary</Text>
            <View style={styles.summaryGrid}>
              <Card style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="trending-up" size={24} color="#2ECC71" />
                  <Text style={styles.summaryLabel}>Total Purchase</Text>
                </View>
                <Text style={styles.summaryValue}>
                  {formatNumber(allTradesData.totals.totalBuyQuantity)} MT
                </Text>
                <Text style={styles.summaryRate}>
                  ₹{allTradesData.totals.avgBuyRate.toFixed(2)}
                </Text>
              </Card>

              <Card style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="trending-down" size={24} color="#E74C3C" />
                  <Text style={styles.summaryLabel}>Total Sell</Text>
                </View>
                <Text style={styles.summaryValue}>
                  {formatNumber(allTradesData.totals.totalSellQuantity)} MT
                </Text>
                <Text style={styles.summaryRate}>
                  ₹{allTradesData.totals.avgSellRate.toFixed(2)}
                </Text>
              </Card>
            </View>
          </View>
        )}

        {/* All Trades Net Profit/Loss Card */}
        {allTradesData?.totals && (
          <View style={styles.profitSection}>
            <Card style={styles.profitCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="wallet" size={24} color="#3282B8" />
                <Text style={styles.summaryLabel}>Net Profit/Loss</Text>
              </View>
              <Text style={[
                styles.summaryValue,
                { color: allTradesData.totals.totalProfit >= 0 ? '#2ECC71' : '#E74C3C' }
              ]}>
                {formatCurrency(allTradesData.totals.totalProfit)}
              </Text>
              <Text style={[
                styles.summaryPercentage,
                { color: allTradesData.totals.totalProfit >= 0 ? '#2ECC71' : '#E74C3C' }
              ]}>
                {getProfitPercentage(allTradesData.totals.totalBuy, allTradesData.totals.totalSell).toFixed(2)}%
              </Text>
            </Card>
          </View>
        )}

        {/* All Trades Section */}
        <Card style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => router.push({
              pathname: '/all-trades-breakdown',
              params: { date: selectedDate }
            })}
            activeOpacity={0.7}
          >
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="trending-up" size={24} color="#007AFF" />
              <Text style={styles.sectionTitle}>All Trades</Text>
            </View>
            <View style={styles.sectionSummary}>
              <Text style={styles.sectionProfit}>
                {formatCurrency(allTradesData?.totals.totalProfit || 0)}
              </Text>
              <Text style={styles.sectionPercentage}>
                {getProfitPercentage(allTradesData?.totals.totalBuy || 0, allTradesData?.totals.totalSell || 0).toFixed(2)}%
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#6B7280" />
          </TouchableOpacity>
        </Card>

        {/* Future P&L Summary */}
        {futureData?.totals && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Future P&L Summary</Text>
            <View style={styles.summaryGrid}>
              <Card style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="trending-up" size={24} color="#2ECC71" />
                  <Text style={styles.summaryLabel}>Total Purchase</Text>
                </View>
                <Text style={styles.summaryValue}>
                  {formatNumber(futureData.totals.totalBuyQuantity)} MT
                </Text>
                <Text style={styles.summaryRate}>
                  ₹{futureData.totals.avgBuyRate.toFixed(2)}
                </Text>
              </Card>

              <Card style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="trending-down" size={24} color="#E74C3C" />
                  <Text style={styles.summaryLabel}>Total Sell</Text>
                </View>
                <Text style={styles.summaryValue}>
                  {formatNumber(futureData.totals.totalSellQuantity)} MT
                </Text>
                <Text style={styles.summaryRate}>
                  ₹{futureData.totals.avgSellRate.toFixed(2)}
                </Text>
              </Card>
            </View>
          </View>
        )}

        {/* Future P&L Net Profit/Loss Card */}
        {futureData?.totals && (
          <View style={styles.profitSection}>
            <Card style={styles.profitCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="wallet" size={24} color="#3282B8" />
                <Text style={styles.summaryLabel}>Net Profit/Loss</Text>
              </View>
              <Text style={[
                styles.summaryValue,
                { color: futureData.totals.totalProfit >= 0 ? '#2ECC71' : '#E74C3C' }
              ]}>
                {formatCurrency(futureData.totals.totalProfit)}
              </Text>
              <Text style={[
                styles.summaryPercentage,
                { color: futureData.totals.totalProfit >= 0 ? '#2ECC71' : '#E74C3C' }
              ]}>
                {getProfitPercentage(futureData.totals.totalBuy, futureData.totals.totalSell).toFixed(2)}%
              </Text>
            </Card>
          </View>
        )}

        {/* Future P&L Section */}
        <Card style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => router.push('/future-pl-breakdown')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="time" size={24} color="#F39C12" />
              <Text style={styles.sectionTitle}>Future P&L</Text>
            </View>
            <View style={styles.sectionSummary}>
              <Text style={styles.sectionProfit}>
                {formatCurrency(futureData?.totals.totalProfit || 0)}
              </Text>
              <Text style={styles.sectionPercentage}>
                {getProfitPercentage(futureData?.totals.totalBuy || 0, futureData?.totals.totalSell || 0).toFixed(2)}%
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#6B7280" />
          </TouchableOpacity>
        </Card>

        {/* Information Section */}
        <View style={styles.infoSection}>
          <Card>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={24} color="#0F4C75" />
              <Text style={styles.infoTitle}>P&L Information</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoText}>
                • Average Buy Rate = Total Purchase Value ÷ Total Quantity
              </Text>
              <Text style={styles.infoText}>
                • Profit/Loss = (Avg Sell Rate - Avg Buy Rate) × Sell Quantity in kg
              </Text>
              <Text style={styles.infoText}>
                • Green indicates profit, red indicates loss
              </Text>
              <Text style={styles.infoText}>
                • Buy quantity in packs (1 pack = 1000 kg), sell quantity in kg
              </Text>
              <Text style={styles.infoText}>
                • Rate is per 10kg
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Date Selection Modal */}
      <Modal
        visible={showDateModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <TextInput
              style={styles.dateInput}
              value={dateInput}
              onChangeText={setDateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.modalActions}>
              <Button
                title="Apply"
                onPress={handleDateChange}
                style={styles.modalButton}
              />
              <Button
                title="Cancel"
                onPress={() => setShowDateModal(false)}
                variant="secondary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  scrollView: {
    flex: 1,
  },
  dateSection: {
    padding: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginHorizontal: 8,
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
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profitSection: {
    padding: 16,
  },
  profitCard: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    margin: 16,
    padding: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionSummary: {
    alignItems: 'flex-end',
    marginRight: 16,
  },
  sectionProfit: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  sectionPercentage: {
    fontSize: 12,
    color: '#666',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  summaryQuantity: {
    fontSize: 12,
    color: '#6B7280',
  },
  summaryRate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
  },
  summaryPercentage: {
    fontSize: 12,
    fontWeight: '600',
  },
  productsSection: {
    padding: 16,
  },
  productCard: {
    marginBottom: 12,
    padding: 16,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 12,
    color: '#6B7280',
  },
  profitIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  profitText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profitPercentage: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: 2,
  },
  productDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  infoSection: {
    padding: 16,
    paddingBottom: 32,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  infoContent: {
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
}); 