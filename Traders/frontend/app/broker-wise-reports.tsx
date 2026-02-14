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
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { reportAPI, itemsAPI, brokersAPI } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import SearchableDropdown from '../components/dropdowns/SearchableDropdown';

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
  broker_name?: string;
}

interface Item {
  id: number;
  item_name: string;
}

interface Broker {
  id: number;
  broker_name: string;
}

export default function BrokerWiseReportsScreen() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Filter states
  const [transactionType, setTransactionType] = useState<string>('');
  const [selectedBrokers, setSelectedBrokers] = useState<number[]>([]);
  const [selectAllBrokers, setSelectAllBrokers] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectAllItems, setSelectAllItems] = useState(false);
  const [brokerSearchQuery, setBrokerSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Data for dropdowns
  const [items, setItems] = useState<Item[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);

  const transactionTypes = [
    { id: 1, name: 'Purchase' },
    { id: 2, name: 'Sell' },
  ];

  useFocusEffect(
    React.useCallback(() => {
      fetchInitialData();
      fetchReports();
    }, [])
  );

  const fetchInitialData = async () => {
    try {
      const [itemsResponse, brokersResponse] = await Promise.all([
        itemsAPI.getAll(),
        brokersAPI.getAll(),
      ]);
      setItems(itemsResponse.data);
      setBrokers(brokersResponse.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params: any = {};
      
      if (transactionType) {
        const selectedType = transactionTypes.find(t => t.id.toString() === transactionType);
        if (selectedType) {
          params.transaction_type = selectedType.name.toLowerCase();
        }
      }
      
      if (selectedBrokers.length > 0) {
        params.broker_ids = selectedBrokers.join(',');
      }
      
      if (selectedItems.length > 0) {
        params.item_ids = selectedItems.join(',');
      }

      if (startDate) {
        params.start_date = startDate;
      }

      if (endDate) {
        params.end_date = endDate;
      }

      const response = await reportAPI.getBrokerWise(params);
      setReports(response.data);
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      Alert.alert('Error', 'Failed to load reports');
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const handleApplyFilters = () => {
    setShowFilterModal(false);
    fetchReports();
  };

  const handleResetFilters = () => {
    setTransactionType('');
    setSelectedBrokers([]);
    setSelectAllBrokers(false);
    setSelectedItems([]);
    setSelectAllItems(false);
    setStartDate('');
    setEndDate('');
  };

  const handleSelectAllBrokers = () => {
    if (selectAllBrokers) {
      setSelectedBrokers([]);
      setSelectAllBrokers(false);
    } else {
      setSelectedBrokers(brokers.map(broker => broker.id));
      setSelectAllBrokers(true);
    }
  };

  const handleBrokerToggle = (brokerId: number) => {
    setSelectedBrokers(prev => 
      prev.includes(brokerId) 
        ? prev.filter(id => id !== brokerId)
        : [...prev, brokerId]
    );
  };

  const handleSelectAllItems = () => {
    if (selectAllItems) {
      setSelectedItems([]);
      setSelectAllItems(false);
    } else {
      setSelectedItems(items.map(item => item.id));
      setSelectAllItems(true);
    }
  };

  const handleItemToggle = (itemId: number) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(true);
    try {
      const exportParams: any = {
        report_type: 'broker-wise',
      };
      
      if (transactionType) {
        const selectedType = transactionTypes.find(t => t.id.toString() === transactionType);
        if (selectedType) {
          exportParams.transaction_type = selectedType.name.toLowerCase();
        }
      }
      
      if (selectedBrokers.length > 0) {
        exportParams.broker_ids = selectedBrokers.join(',');
      }
      
      if (selectedItems.length > 0) {
        exportParams.item_ids = selectedItems.join(',');
      }

      if (startDate) {
        exportParams.start_date = startDate;
      }

      if (endDate) {
        exportParams.end_date = endDate;
      }

      const response = format === 'pdf' 
        ? await reportAPI.exportPDF(exportParams)
        : await reportAPI.exportExcel(exportParams);

      const fileName = format === 'excel' ? 'broker-wise-report.xls' : `broker-wise-report.${format}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      const reader = new FileReader();
      const blob = response.data;
      
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const base64Data = await base64Promise;
      
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: format === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel',
          dialogTitle: `Broker-wise Report - ${format.toUpperCase()}`,
        });
      }

      setShowExportModal(false);
      Alert.alert('Success', `${format.toUpperCase()} exported successfully`);
    } catch (error) {
      console.error('Error exporting report:', error);
      Alert.alert('Error', `Failed to export ${format.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatSaudaNumber = (saudaNo: string) => {
    if (saudaNo.startsWith('20')) {
      return saudaNo.substring(2);
    }
    return saudaNo;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading reports...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Broker-wise</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.headerButton}>
              <Ionicons name="filter-outline" size={24} color="#0F4C75" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowExportModal(true)} style={styles.headerButton}>
              <Ionicons name="download-outline" size={24} color="#0F4C75" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Filters Display */}
        {(transactionType || selectedBrokers.length > 0 || selectedItems.length > 0 || startDate || endDate) && (
          <Card style={styles.filtersCard}>
            <Text style={styles.filtersTitle}>Active Filters:</Text>
            {transactionType && (
              <Text style={styles.filterText}>
                Type: {transactionTypes.find(t => t.id.toString() === transactionType)?.name}
              </Text>
            )}
            {selectedBrokers.length > 0 && (
              <Text style={styles.filterText}>
                Brokers: {selectedBrokers.length} selected
              </Text>
            )}
            {selectedItems.length > 0 && (
              <Text style={styles.filterText}>
                Items: {selectedItems.length} selected
              </Text>
            )}
            {startDate && <Text style={styles.filterText}>From Date: {startDate}</Text>}
            {endDate && <Text style={styles.filterText}>To Date: {endDate}</Text>}
          </Card>
        )}

        {/* Reports Table */}
        <View style={styles.reportsSection}>
          {reports.length > 0 ? (
            <Card style={styles.tableCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={styles.tableContainer}>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.headerCell, styles.srNoCell]}>Sr No.</Text>
                    <Text style={[styles.headerCell, styles.dateCell]}>Date</Text>
                    <Text style={[styles.headerCell, styles.saudaNoCell]}>Sauda No</Text>
                    <Text style={[styles.headerCell, styles.typeCell]}>Type</Text>
                    <Text style={[styles.headerCell, styles.brokerCell]}>Broker</Text>
                    <Text style={[styles.headerCell, styles.partyCell]}>Party</Text>
                    <Text style={[styles.headerCell, styles.itemCell]}>Item</Text>
                    <Text style={[styles.headerCell, styles.qtyCell]}>Qty (MT)</Text>
                    <Text style={[styles.headerCell, styles.rateCell]}>Rate</Text>
                    <Text style={[styles.headerCell, styles.statusCell]}>Status</Text>
                  </View>
                  
                  {/* Table Rows */}
                  {reports.map((item, index) => (
                    <View key={item.id} style={styles.tableRow}>
                      <Text style={[styles.cell, styles.srNoCell]}>{index + 1}</Text>
                      <Text style={[styles.cell, styles.dateCell]}>{formatDate(item.date)}</Text>
                      <Text style={[styles.cell, styles.saudaNoCell]}>{formatSaudaNumber(item.sauda_no)}</Text>
                      <Text style={[
                        styles.cell,
                        styles.typeCell,
                        { color: item.transaction_type === 'purchase' ? '#2ECC71' : '#E74C3C', fontWeight: '600' }
                      ]}>
                        {item.transaction_type === 'purchase' ? 'Buy' : 'Sell'}
                      </Text>
                      <Text style={[styles.cell, styles.brokerCell]} numberOfLines={2}>{item.broker_name || '-'}</Text>
                      <Text style={[styles.cell, styles.partyCell]} numberOfLines={2}>{item.party_name}</Text>
                      <Text style={[styles.cell, styles.itemCell]} numberOfLines={2}>{item.item_name}</Text>
                      <Text style={[styles.cell, styles.qtyCell]}>{item.quantity_packs} MT</Text>
                      <Text style={[styles.cell, styles.rateCell]}>₹{item.rate_per_10kg ? parseFloat(item.rate_per_10kg).toFixed(2) : '0.00'}</Text>
                      <Text style={[
                        styles.cell,
                        styles.statusCell,
                        { color: item.loading_status === 'completed' ? '#2ECC71' : item.loading_status === 'pending' ? '#F39C12' : '#6B7280' }
                      ]}>
                        {item.loading_status || '-'}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Card>
          ) : (
            <Card>
              <View style={styles.emptyContent}>
                <Ionicons name="document-outline" size={48} color="#6B7280" />
                <Text style={styles.emptyText}>No reports found</Text>
              </View>
            </Card>
          )}
        </View>

        {/* Filter Modal */}
        <Modal
          visible={showFilterModal}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Filter Options</Text>
              
              <ScrollView style={styles.filterScrollView}>
                {/* Transaction Type */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Transaction Type</Text>
                  <SearchableDropdown
                    label="Transaction Type"
                    value={transactionType}
                    placeholder="Select transaction type"
                    items={transactionTypes}
                    onSelect={(id) => setTransactionType(id)}
                  />
                </View>

                {/* Brokers */}
                <View style={styles.filterSection}>
                  <View style={styles.filterHeader}>
                    <Text style={styles.filterLabel}>Brokers ({brokers.length} available)</Text>
                    <TouchableOpacity onPress={handleSelectAllBrokers}>
                      <Text style={styles.selectAllText}>
                        {selectAllBrokers ? 'Deselect All' : 'Select All'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {/* Search Input */}
                  <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color="#6B7280" style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search brokers..."
                      value={brokerSearchQuery}
                      onChangeText={setBrokerSearchQuery}
                      placeholderTextColor="#9CA3AF"
                    />
                    {brokerSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setBrokerSearchQuery('')} style={styles.clearSearchButton}>
                        <Ionicons name="close-circle" size={20} color="#6B7280" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView style={styles.checkboxList}>
                    {(() => {
                      const filteredBrokers = brokerSearchQuery
                        ? brokers.filter(broker =>
                            broker.broker_name.toLowerCase().includes(brokerSearchQuery.toLowerCase())
                          )
                        : brokers;
                      
                      return filteredBrokers.length === 0 ? (
                        <Text style={styles.noItemsText}>
                          {brokerSearchQuery ? 'No brokers found' : 'No brokers available'}
                        </Text>
                      ) : (
                        filteredBrokers.map((broker) => (
                          <TouchableOpacity
                            key={broker.id}
                            style={styles.checkboxItem}
                            onPress={() => handleBrokerToggle(broker.id)}
                          >
                            <Ionicons
                              name={selectedBrokers.includes(broker.id) ? 'checkbox' : 'square-outline'}
                              size={20}
                              color={selectedBrokers.includes(broker.id) ? '#0F4C75' : '#6B7280'}
                            />
                            <Text style={styles.checkboxText}>{broker.broker_name}</Text>
                          </TouchableOpacity>
                        ))
                      );
                    })()}
                  </ScrollView>
                </View>

                {/* Items */}
                <View style={styles.filterSection}>
                  <View style={styles.filterHeader}>
                    <Text style={styles.filterLabel}>Items ({items.length} available)</Text>
                    <TouchableOpacity onPress={handleSelectAllItems}>
                      <Text style={styles.selectAllText}>
                        {selectAllItems ? 'Deselect All' : 'Select All'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.checkboxList}>
                    {items.length === 0 ? (
                      <Text style={styles.noItemsText}>No items available</Text>
                    ) : (
                      items.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.checkboxItem}
                          onPress={() => handleItemToggle(item.id)}
                        >
                          <Ionicons
                            name={selectedItems.includes(item.id) ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={selectedItems.includes(item.id) ? '#0F4C75' : '#6B7280'}
                          />
                          <Text style={styles.checkboxText}>{item.item_name}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>

                {/* Date Range */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Date Range</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="Start Date (YYYY-MM-DD)"
                    value={startDate}
                    onChangeText={setStartDate}
                  />
                  <TextInput
                    style={styles.dateInput}
                    placeholder="End Date (YYYY-MM-DD)"
                    value={endDate}
                    onChangeText={setEndDate}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <Button
                  title="Reset"
                  onPress={handleResetFilters}
                  variant="secondary"
                  style={styles.modalButton}
                />
                <Button
                  title="Apply Filters"
                  onPress={handleApplyFilters}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Export Modal */}
        <Modal
          visible={showExportModal}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Export Report</Text>
              <Text style={styles.modalSubtitle}>Choose export format:</Text>
              
              <View style={styles.exportButtons}>
                <Button
                  title="Export as PDF"
                  onPress={() => handleExport('pdf')}
                  disabled={exporting}
                  style={styles.exportButton}
                />
                <Button
                  title="Export as Excel"
                  onPress={() => handleExport('excel')}
                  disabled={exporting}
                  style={styles.exportButton}
                />
              </View>
              
              <Button
                title="Cancel"
                onPress={() => setShowExportModal(false)}
                variant="secondary"
                style={styles.cancelButton}
              />
            </View>
          </View>
        </Modal>
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
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  filtersCard: {
    margin: 16,
    padding: 12,
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  filterText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  reportsSection: {
    padding: 16,
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  filterScrollView: {
    maxHeight: 400,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectAllText: {
    fontSize: 14,
    color: '#0F4C75',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  clearSearchButton: {
    padding: 4,
  },
  checkboxList: {
    maxHeight: 200,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  checkboxText: {
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
  },
  exportButtons: {
    gap: 12,
    marginBottom: 20,
  },
  exportButton: {
    marginBottom: 8,
  },
  cancelButton: {
    marginTop: 8,
  },
  noItemsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    padding: 16,
  },
  tableCard: {
    padding: 0,
    overflow: 'hidden',
  },
  tableContainer: {
    minWidth: 1100,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0F4C75',
    borderBottomWidth: 2,
    borderBottomColor: '#0A3D5C',
  },
  headerCell: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.2)',
  },
  srNoCell: {
    width: 60,
    minWidth: 60,
  },
  dateCell: {
    width: 90,
    minWidth: 90,
  },
  saudaNoCell: {
    width: 100,
    minWidth: 100,
  },
  typeCell: {
    width: 70,
    minWidth: 70,
  },
  brokerCell: {
    width: 150,
    minWidth: 150,
  },
  partyCell: {
    width: 180,
    minWidth: 180,
  },
  itemCell: {
    width: 200,
    minWidth: 200,
  },
  qtyCell: {
    width: 90,
    minWidth: 90,
  },
  rateCell: {
    width: 100,
    minWidth: 100,
  },
  statusCell: {
    width: 100,
    minWidth: 100,
    borderRightWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  cell: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#374151',
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
});

