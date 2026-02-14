import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { plusMinusAPI } from '../services/api';
import Card from '../components/Card';
import Header from '../components/Header';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ProductData {
  product_type: string;
  buy_total: number;
  sell_total: number;
  profit: number;
  buy_quantity: number;
  sell_quantity: number;
  avg_buy_rate: number;
  avg_sell_rate: number;
}

export default function FuturePLBreakdownScreen() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const response = await plusMinusAPI.getFuture();
      const rows = response.data;
      
      if (Array.isArray(rows)) {
        const productsData = rows.map(row => ({
          product_type: row.product_type || row.item_name,
          buy_total: parseFloat(row.buy_total),
          sell_total: parseFloat(row.sell_total),
          profit: parseFloat(row.profit),
          buy_quantity: parseFloat(row.buy_quantity || 0),
          sell_quantity: parseFloat(row.sell_quantity || 0),
          avg_buy_rate: parseFloat(row.avg_buy_rate || 0),
          avg_sell_rate: parseFloat(row.avg_sell_rate || 0)
        }));
        setProducts(productsData);
      } else {
        setProducts([]);
      }
    } catch (error: any) {
      console.log('No future P&L data available:', error);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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

  const getProfitPercentage = (buy: number, sell: number) => {
    if (buy === 0) return sell > 0 ? 100 : 0;
    return ((sell - buy) / buy) * 100;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Future P&L breakdown...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Future P&L Breakdown"
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Info Header */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="time" size={20} color="#F39C12" />
            <Text style={styles.infoText}>Pending Loading Trades Only</Text>
          </View>
        </Card>

        {/* Products List */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Product-wise Breakdown</Text>
          {products && products.length > 0 ? (
            products.map((product) => {
              const profitPercentage = getProfitPercentage(product.buy_total, product.sell_total);
              return (
                <Card key={product.product_type} style={styles.productCard}>
                  <View style={styles.productHeader}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.product_type}</Text>
                    </View>
                    <View style={[
                      styles.profitIndicator,
                      { backgroundColor: product.profit >= 0 ? '#2ECC71' : '#E74C3C' }
                    ]}>
                      <Text style={styles.profitText}>
                        {product.profit >= 0 ? '+' : ''}{formatCurrency(product.profit)}
                      </Text>
                      <Text style={styles.profitPercentage}>
                        {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(2)}%
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
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Profit/Loss:</Text>
                      <Text style={[
                        styles.detailValue,
                        { color: product.profit >= 0 ? '#2ECC71' : '#E74C3C' }
                      ]}>
                        {product.profit >= 0 ? '+' : ''}{formatCurrency(product.profit)}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })
          ) : (
            <Card style={styles.emptyCard}>
              <Ionicons name="time-outline" size={48} color="#6B7280" />
              <Text style={styles.emptyText}>No pending loading trades</Text>
              <Text style={styles.emptySubtext}>
                Future P&L shows profit/loss for trades with pending loading
              </Text>
            </Card>
          )}
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
  infoCard: {
    margin: 16,
    padding: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  productsSection: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
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
});
