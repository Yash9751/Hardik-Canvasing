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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { plusMinusAPI } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { SafeAreaView } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get('window').width;

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

export default function PnLReportScreen() {
  const [allTradesData, setAllTradesData] = useState<PlusMinusData | null>(null);
  const [futureData, setFutureData] = useState<FuturePlusMinusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateInput, setDateInput] = useState(selectedDate);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAllTradesBreakdown, setShowAllTradesBreakdown] = useState(false);
  const [showFutureBreakdown, setShowFutureBreakdown] = useState(false);

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
      console.error('P&L error:', error);
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
      fetchData();
      Alert.alert('Success', 'P&L report generated successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to generate P&L report');
      console.error('Generate report error:', error);
    }
  };

  const handleDateChange = () => {
    setSelectedDate(dateInput);
    setShowDateModal(false);
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getProfitPercentage = (buy: number, sell: number) => {
    if (buy === 0) return 0;
    return ((sell - buy) / buy) * 100;
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(true);
    try {
      let response;
      if (format === 'pdf') {
        response = await plusMinusAPI.exportPDF({ date: selectedDate });
      } else {
        response = await plusMinusAPI.exportExcel({ date: selectedDate });
      }

      const fileName = `pnl-report-${selectedDate}.${format === 'pdf' ? 'pdf' : 'xls'}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, response.data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await Sharing.shareAsync(fileUri, {
          mimeType: format === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel',
        dialogTitle: `P&L Report - ${formatDate(selectedDate)}`,
        });
    } catch (error: any) {
      Alert.alert('Error', `Failed to export ${format.toUpperCase()} report`);
      console.error(`Export ${format} error:`, error);
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
  };

  const getProfitLossChartData = () => {
    if (!allTradesData || allTradesData.products.length === 0) return null;

    return {
      labels: allTradesData.products.map(p => p.product_type.substring(0, 8) + '...'),
      datasets: [{
        data: allTradesData.products.map(p => p.profit)
      }]
    };
  };

  const getQuantityComparisonData = () => {
    if (!allTradesData || allTradesData.products.length === 0) return null;

    return {
      labels: allTradesData.products.map(p => p.product_type.substring(0, 8) + '...'),
      datasets: [
        {
          data: allTradesData.products.map(p => p.buy_quantity),
          color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
          strokeWidth: 2
        },
        {
          data: allTradesData.products.map(p => p.sell_quantity / 1000),
          color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: ['Buy', 'Sell']
    };
  };

  const getPieChartData = () => {
    if (!allTradesData || allTradesData.products.length === 0) return [];

    return allTradesData.products.map((product, index) => ({
      name: product.product_type,
      quantity: product.sell_quantity / 1000,
      color: `hsl(${index * 360 / allTradesData.products.length}, 70%, 50%)`,
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading P&L Report...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="P&L Report"
        onBack={() => router.back()}
        rightAction={{
          icon: 'download-outline',
          onPress: () => setShowExportModal(true)
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Date Selection */}
        <Card style={styles.dateCard}>
          <View style={styles.dateHeader}>
            <Text style={styles.dateLabel}>Report Date:</Text>
            <TouchableOpacity
              onPress={() => setShowDateModal(true)}
              style={styles.dateButton}
            >
              <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
              <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
          <Button
            title="Generate Report"
            onPress={generateReport}
            style={styles.generateButton}
          />
        </Card>

        {allTradesData && (
          <>
            {/* Summary Cards - Side by Side */}
            <View style={styles.summaryContainer}>
              <Card style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Total Purchase</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryQuantity}>
                    {formatNumber(allTradesData.totals.totalBuyQuantity)} MT
                  </Text>
                  <Text style={styles.summaryRate}>
                    ₹{allTradesData.totals.avgBuyRate.toFixed(2)}
                  </Text>
                </View>
              </Card>

              <Card style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Total Sell</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryQuantity}>
                    {formatNumber(allTradesData.totals.totalSellQuantity)} MT
                  </Text>
                  <Text style={styles.summaryRate}>
                    ₹{allTradesData.totals.avgSellRate.toFixed(2)}
                  </Text>
                </View>
              </Card>
            </View>

            {/* Net Profit/Loss Card */}
            <View style={styles.profitContainer}>
              <Card style={[styles.summaryCard, styles.profitCard]}>
                <Text style={styles.summaryTitle}>Net Profit/Loss</Text>
                <Text style={[
                  styles.profitText,
                  { color: allTradesData.totals.totalProfit >= 0 ? '#2ECC71' : '#E74C3C' }
                ]}>
                  {formatCurrency(allTradesData.totals.totalProfit)}
                </Text>
                <Text style={styles.profitPercentage}>
                  {getProfitPercentage(allTradesData.totals.totalBuy, allTradesData.totals.totalSell).toFixed(2)}%
                </Text>
              </Card>
            </View>

            {/* All Trades Section */}
            <Card style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setShowAllTradesBreakdown(!showAllTradesBreakdown)}
                activeOpacity={0.7}
              >
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="trending-up" size={24} color="#007AFF" />
                  <Text style={styles.sectionTitle}>All Trades</Text>
                </View>
                <View style={styles.sectionSummary}>
                  <Text style={styles.sectionProfit}>
                    {formatCurrency(allTradesData.totals.totalProfit)}
                  </Text>
                  <Text style={styles.sectionPercentage}>
                    {getProfitPercentage(allTradesData.totals.totalBuy, allTradesData.totals.totalSell).toFixed(2)}%
                  </Text>
                </View>
                <Ionicons 
                  name={showAllTradesBreakdown ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color="#6B7280" 
                />
              </TouchableOpacity>

              {showAllTradesBreakdown && (
                <View style={styles.breakdownContent}>
                  {allTradesData.products.map((product, index) => (
                    <View key={product.product_type} style={styles.productItem}>
                      <View style={styles.productHeader}>
                        <Text style={styles.productName}>{product.product_type}</Text>
                        <View style={styles.productProfit}>
                          <Text style={[
                            styles.productProfitText,
                            { color: product.profit >= 0 ? '#2ECC71' : '#E74C3C' }
                          ]}>
                            {formatCurrency(product.profit)}
                          </Text>
                          <Text style={styles.productProfitPercentage}>
                            {getProfitPercentage(product.buy_total, product.sell_total).toFixed(2)}%
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.productDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Purchase Quantity:</Text>
                          <Text style={styles.detailValue}>
                            {formatNumber(product.buy_quantity)} MT
                          </Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Avg Purchase Rate:</Text>
                          <Text style={styles.detailValue}>
                            ₹{product.avg_buy_rate.toFixed(2)}
                          </Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Sell Quantity:</Text>
                          <Text style={styles.detailValue}>
                            {formatNumber(product.sell_quantity / 1000)} MT
                          </Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Avg Sell Rate:</Text>
                          <Text style={styles.detailValue}>
                            ₹{product.avg_sell_rate.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </Card>

            {/* Future P&L Section */}
            <Card style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setShowFutureBreakdown(!showFutureBreakdown)}
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
                <Ionicons 
                  name={showFutureBreakdown ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color="#6B7280" 
                />
              </TouchableOpacity>

              {showFutureBreakdown && (
                <View style={styles.breakdownContent}>
                  {futureData && futureData.products.length > 0 ? (
                    futureData.products.map((product, index) => (
                      <View key={product.product_type} style={styles.productItem}>
                        <View style={styles.productHeader}>
                          <Text style={styles.productName}>{product.product_type}</Text>
                          <View style={styles.productProfit}>
                            <Text style={[
                              styles.productProfitText,
                              { color: product.profit >= 0 ? '#2ECC71' : '#E74C3C' }
                            ]}>
                              {formatCurrency(product.profit)}
                            </Text>
                            <Text style={styles.productProfitPercentage}>
                              {getProfitPercentage(product.buy_total, product.sell_total).toFixed(2)}%
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.productDetails}>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Purchase Quantity:</Text>
                            <Text style={styles.detailValue}>
                              {formatNumber(product.buy_quantity)} MT
                            </Text>
                          </View>
                          
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Avg Purchase Rate:</Text>
                            <Text style={styles.detailValue}>
                              ₹{product.avg_buy_rate.toFixed(2)}
                            </Text>
                          </View>
                          
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Sell Quantity:</Text>
                            <Text style={styles.detailValue}>
                              {formatNumber(product.sell_quantity / 1000)} MT
                            </Text>
                          </View>
                          
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Avg Sell Rate:</Text>
                            <Text style={styles.detailValue}>
                              ₹{product.avg_sell_rate.toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.noDataContent}>
                      <Ionicons name="time-outline" size={48} color="#6B7280" />
                      <Text style={styles.noDataText}>No pending loading trades</Text>
                    </View>
                  )}
                </View>
              )}
            </Card>

            {/* Charts Section */}
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>Profit/Loss by Product</Text>
              {getProfitLossChartData() && (
                <BarChart
                  data={getProfitLossChartData()!}
                  width={screenWidth - 60}
                  height={220}
                  yAxisLabel="₹"
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16
                    },
                    barPercentage: 0.7,
                  }}
                  style={{
                    marginVertical: 8,
                    borderRadius: 16
                  }}
                />
              )}
            </Card>

            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>Quantity Comparison (Buy vs Sell)</Text>
              {getQuantityComparisonData() && (
                <LineChart
                  data={getQuantityComparisonData()!}
                  width={screenWidth - 60}
                  height={220}
                  yAxisLabel="MT "
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: '6',
                      strokeWidth: '2',
                      stroke: '#3498DB'
                    }
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16
                  }}
                />
              )}
            </Card>

            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>Product Distribution</Text>
              {getPieChartData().length > 0 && (
                <PieChart
                  data={getPieChartData()}
                  width={screenWidth - 60}
                  height={220}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="quantity"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              )}
            </Card>
          </>
        )}

        {!allTradesData && (
          <Card style={styles.noDataCard}>
            <Text style={styles.noDataText}>No P&L data available for this date</Text>
            <Button
              title="Generate Report"
              onPress={generateReport}
              style={styles.generateButton}
            />
          </Card>
        )}
      </ScrollView>

      {/* Date Selection Modal */}
      <Modal
        visible={showDateModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <TextInput
              style={styles.dateInput}
              value={dateInput}
              onChangeText={setDateInput}
              placeholder="YYYY-MM-DD"
              keyboardType="default"
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setShowDateModal(false)}
                style={styles.cancelButton}
              />
              <Button
                title="OK"
                onPress={handleDateChange}
                style={styles.okButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Export P&L Report</Text>
            <View style={styles.exportButtons}>
              <TouchableOpacity
                style={styles.exportOption}
                onPress={() => handleExport('pdf')}
                disabled={exporting}
              >
                <Ionicons name="document-text-outline" size={32} color="#E74C3C" />
                <Text style={styles.exportText}>PDF</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.exportOption}
                onPress={() => handleExport('excel')}
                disabled={exporting}
              >
                <Ionicons name="grid-outline" size={32} color="#27AE60" />
                <Text style={styles.exportText}>Excel</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  exportButton: {
    padding: 8,
  },
  dateCard: {
    margin: 16,
    padding: 16,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 8,
  },
  generateButton: {
    backgroundColor: '#007AFF',
  },
  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  profitContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    alignItems: 'center',
  },
  profitCard: {
    backgroundColor: '#f8f9fa',
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryRow: {
    alignItems: 'center',
  },
  summaryQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  summaryRate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  profitText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profitPercentage: {
    fontSize: 12,
    color: '#666',
  },
  sectionCard: {
    margin: 16,
    padding: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  sectionSummary: {
    alignItems: 'flex-end',
    marginRight: 16,
  },
  sectionProfit: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionPercentage: {
    fontSize: 12,
    color: '#666',
  },
  breakdownContent: {
    padding: 16,
  },
  noDataContent: {
    alignItems: 'center',
    padding: 32,
  },
  productItem: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  productProfit: {
    alignItems: 'flex-end',
  },
  productProfitText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  productProfitPercentage: {
    fontSize: 12,
    color: '#666',
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
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  chartCard: {
    margin: 16,
    padding: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  noDataCard: {
    margin: 16,
    padding: 32,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#6c757d',
  },
  okButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#007AFF',
  },
  exportButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  exportOption: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    minWidth: 100,
  },
  exportText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 