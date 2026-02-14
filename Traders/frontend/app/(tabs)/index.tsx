import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { dashboardAPI } from '../../services/api';
import { useCompanyProfile } from '../../contexts/CompanyProfileContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import SettingsModal from '../../components/modals/SettingsModal';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DashboardData {
  summary: {
    totalBuy: number;
    totalSell: number;
    totalProfit: number;
    todayBuy: number;
    todaySell: number;
    todayProfit: number;
    todayBuyQuantity: number;
    todaySellQuantity: number;
  };
  purchaseLoading: {
    count: number;
    totalQuantity: number;
  };
  sellLoading: {
    count: number;
    totalQuantity: number;
  };
}

export default function DashboardScreen() {
  const { companyProfile } = useCompanyProfile();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [summaryResponse, purchaseLoadingResponse, sellLoadingResponse] = await Promise.all([
        dashboardAPI.getTodaySummary(),
        dashboardAPI.getTodayPurchaseLoading(),
        dashboardAPI.getTodaySellLoading()
      ]);
      setData({
        summary: summaryResponse.data,
        purchaseLoading: purchaseLoadingResponse.data,
        sellLoading: sellLoadingResponse.data
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
    fetchDashboardData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatQuantity = (quantity: number, unit: string) => {
    return new Intl.NumberFormat('en-IN').format(quantity) + ' ' + unit;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getTransactionIcon = (type: string) => {
    return type === 'purchase' ? 'trending-up' : 'trending-down';
  };

  const getTransactionColor = (type: string) => {
    return type === 'purchase' ? '#2ECC71' : '#E74C3C';
  };

  const handleTodayPurchasePress = () => {
    console.log('Navigating to todays-purchase');
    router.push('../todays-purchase');
  };

  const handleTodaySellPress = () => {
    console.log('Navigating to todays-sell');
    router.push('../todays-sell');
  };

  const handlePurchaseLoadingPress = () => {
    console.log('Navigating to purchase-loading');
    router.push('../purchase-loading');
  };

  const handleSellLoadingPress = () => {
    console.log('Navigating to sell-loading');
    router.push('../sell-loading');
  };

  const handleAddPurchase = () => {
    // Navigate to add purchase with default party
    router.push('/add-buy');
  };

  const handleAddSell = () => {
    // Navigate to add sell with default party
    router.push('/add-sell');
  };

  const handleAddPurchaseLoading = () => {
    router.push('/add-purchase-loading');
  };

  const handleAddSellLoading = () => {
    router.push('/add-sell-loading');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
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
          <View style={styles.headerContent}>
            <Text style={styles.title}>Dashboard</Text>
                            <Text style={styles.subtitle}>{companyProfile?.company_name || 'Traders'}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setSettingsVisible(true)}
            style={styles.settingsButton}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Today's Summary Section - Clickable */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Today's Summary</Text>
          <Card>
            <View style={styles.todayGrid}>
              <TouchableOpacity 
                style={styles.todayItem} 
                onPress={handleTodayPurchasePress}
                activeOpacity={0.7}
              >
                <View style={styles.todayHeader}>
                  <Ionicons name="trending-up" size={20} color="#2ECC71" />
                  <Text style={styles.todayLabel}>Today Purchase</Text>
                  <Ionicons name="chevron-forward" size={16} color="#6B7280" />
                </View>
                <Text style={styles.todayValue}>
                  {formatQuantity(data?.summary.todayBuyQuantity || 0, 'MT')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.todayItem} 
                onPress={handleTodaySellPress}
                activeOpacity={0.7}
              >
                <View style={styles.todayHeader}>
                  <Ionicons name="trending-down" size={20} color="#E74C3C" />
                  <Text style={styles.todayLabel}>Today Sell</Text>
                  <Ionicons name="chevron-forward" size={16} color="#6B7280" />
                </View>
                <Text style={styles.todayValue}>
                  {formatQuantity(data?.summary.todaySellQuantity || 0, 'MT')}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Today's Loading Section - Clickable */}
        <View style={styles.loadingSection}>
          <Text style={styles.sectionTitle}>Today's Loading</Text>
          <Card>
            <View style={styles.todayGrid}>
              <TouchableOpacity 
                style={styles.todayItem} 
                onPress={handlePurchaseLoadingPress}
                activeOpacity={0.7}
              >
                <View style={styles.todayHeader}>
                  <Ionicons name="cube" size={20} color="#F39C12" />
                  <Text style={styles.todayLabel}>Pur. Loading</Text>
                  <Ionicons name="chevron-forward" size={16} color="#6B7280" />
                </View>
                <Text style={styles.todayValue}>
                  {formatQuantity(data?.purchaseLoading.totalQuantity || 0, 'MT')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.todayItem} 
                onPress={handleSellLoadingPress}
                activeOpacity={0.7}
              >
                <View style={styles.todayHeader}>
                  <Ionicons name="send" size={20} color="#E67E22" />
                  <Text style={styles.todayLabel}>Sell Loading</Text>
                  <Ionicons name="chevron-forward" size={16} color="#6B7280" />
                </View>
                <Text style={styles.todayValue}>
                  {formatQuantity(data?.sellLoading.totalQuantity || 0, 'MT')}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Main Action Buttons */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAddPurchase}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="add-circle" size={32} color="#2ECC71" />
              </View>
              <Text style={styles.actionTitle}>Add Purchase</Text>
              {/* <Text style={styles.actionSubtitle}>Default: Good Luck Agro</Text> */}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAddSell}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="remove-circle" size={32} color="#E74C3C" />
              </View>
              <Text style={styles.actionTitle}>Add Sell</Text>
              {/* <Text style={styles.actionSubtitle}>Default: Good Luck Agro</Text> */}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAddPurchaseLoading}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="cube" size={32} color="#F39C12" />
              </View>
              <Text style={styles.actionTitle}>Add Purchase Loading</Text>
              {/* <Text style={styles.actionSubtitle}>Track incoming stock</Text> */}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAddSellLoading}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="send" size={32} color="#E67E22" />
              </View>
              <Text style={styles.actionTitle}>Add Sell Loading</Text>
              {/* <Text style={styles.actionSubtitle}>Track outgoing stock</Text> */}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/rate-update')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="pricetag" size={32} color="#9B59B6" />
              </View>
              <Text style={styles.actionTitle}>Rate Updates</Text>
              {/* <Text style={styles.actionSubtitle}>Item-wise rates</Text> */}
            </TouchableOpacity>
          </View>
        </View>
        <SettingsModal 
          visible={settingsVisible} 
          onClose={() => setSettingsVisible(false)} 
        />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  settingsButton: {
    padding: 8,
  },
  summarySection: {
    padding: 16,
  },
  loadingSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  todayGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  todayItem: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: '45%',
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  todayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
    marginRight: 8,
  },
  todayValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 4,
  },
  todayQuantity: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  actionsSection: {
    padding: 16,
  },
  actionButtons: {
    gap: 16,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionIcon: {
    marginRight: 16,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
});
