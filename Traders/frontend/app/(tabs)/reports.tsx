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
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { reportAPI } from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_CONFIG } from '../../config/api';
import { plusMinusAPI } from '../../services/api';

interface ReportData {
  id: number;
  date: string;
  sauda_no: string;
  party_name: string;
  item_name: string;
  quantity_packs: number;
  rate_per_10kg: number;
  total_value: number;
  transaction_type: string;
  loading_status: string;
  ex_plant_name?: string;
  broker_name?: string;
}

export default function ReportsScreen() {

  const handleRecalculatePL = async () => {
    try {
      await plusMinusAPI.recalculateAll();
      Alert.alert('Success', 'Profit & Loss table recalculated.');
    } catch (error) {
      Alert.alert('Error', 'Failed to recalculate Profit & Loss.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Reports</Text>
        </View>

        {/* Admin Utility: Recalculate P&L Button */}
        <View style={{ alignItems: 'flex-end', padding: 16 }}>
          <TouchableOpacity onPress={handleRecalculatePL} style={styles.recalcButton}>
            <Ionicons name="refresh" size={18} color="#0F4C75" />
            <Text style={styles.recalcButtonText}>Recalculate P&L</Text>
          </TouchableOpacity>
        </View>

        {/* Report Type Selection */}
        <View style={styles.reportTypeSection}>
          <Text style={styles.sectionTitle}>Report Categories</Text>
          
            <TouchableOpacity
            style={styles.reportCard}
            onPress={() => router.push('/all-trades-reports')}
          >
            <View style={styles.reportCardContent}>
              <View style={styles.reportCardIcon}>
                <Ionicons name="document-text" size={24} color="#2ECC71" />
              </View>
              <View style={styles.reportCardText}>
                <Text style={styles.reportCardTitle}>All Trades</Text>
                <Text style={styles.reportCardSubtitle}>View all purchase and sell transactions</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </View>
            </TouchableOpacity>

            <TouchableOpacity
            style={styles.reportCard}
            onPress={() => router.push('/pending-trades-reports')}
          >
            <View style={styles.reportCardContent}>
              <View style={styles.reportCardIcon}>
                <Ionicons name="time" size={24} color="#F39C12" />
              </View>
              <View style={styles.reportCardText}>
                <Text style={styles.reportCardTitle}>Pending Trades</Text>
                <Text style={styles.reportCardSubtitle}>Trades with pending loading quantities</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </View>
            </TouchableOpacity>

            <TouchableOpacity
            style={styles.reportCard}
            onPress={() => router.push('/overdue-trades-reports')}
          >
            <View style={styles.reportCardContent}>
              <View style={styles.reportCardIcon}>
                <Ionicons name="warning" size={24} color="#E74C3C" />
              </View>
              <View style={styles.reportCardText}>
                <Text style={styles.reportCardTitle}>Overdue Trades</Text>
                <Text style={styles.reportCardSubtitle}>Trades with extended loading due dates</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </View>
            </TouchableOpacity>

          <TouchableOpacity
            style={styles.reportCard}
            onPress={() => router.push('/stock-wise-reports')}
          >
            <View style={styles.reportCardContent}>
              <View style={styles.reportCardIcon}>
                <Ionicons name="cube" size={24} color="#3498DB" />
          </View>
              <View style={styles.reportCardText}>
                <Text style={styles.reportCardTitle}>Stock-wise</Text>
                <Text style={styles.reportCardSubtitle}>Filter by items and ex-plants</Text>
        </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reportCard}
            onPress={() => router.push('/party-wise-reports')}
          >
            <View style={styles.reportCardContent}>
              <View style={styles.reportCardIcon}>
                <Ionicons name="people" size={24} color="#9B59B6" />
        </View>
              <View style={styles.reportCardText}>
                <Text style={styles.reportCardTitle}>Party-wise</Text>
                <Text style={styles.reportCardSubtitle}>Filter by parties and items</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reportCard}
            onPress={() => router.push('/broker-wise-reports')}
          >
            <View style={styles.reportCardContent}>
              <View style={styles.reportCardIcon}>
                <Ionicons name="briefcase" size={24} color="#E67E22" />
              </View>
              <View style={styles.reportCardText}>
                <Text style={styles.reportCardTitle}>Broker-wise</Text>
                <Text style={styles.reportCardSubtitle}>Filter by brokers and items</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reportCard}
            onPress={() => router.push('/pnl-report')}
        >
            <View style={styles.reportCardContent}>
              <View style={styles.reportCardIcon}>
                <Ionicons name="trending-up" size={24} color="#16A085" />
              </View>
              <View style={styles.reportCardText}>
                <Text style={styles.reportCardTitle}>P&L Report</Text>
                <Text style={styles.reportCardSubtitle}>Profit & Loss with charts and analysis</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </View>
          </TouchableOpacity>
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
    fontSize: 24,
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
  reportTypeSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reportCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  reportCardText: {
    flex: 1,
  },
  reportCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  reportCardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionsSection: {
    padding: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  reportsSection: {
    padding: 16,
  },
  reportsList: {
    // removed flex: 1
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportIcon: {
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  saudaNo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  partyName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  reportValues: {
    alignItems: 'flex-end',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  loadingStatus: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
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