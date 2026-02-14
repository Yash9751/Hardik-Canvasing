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
import { reportAPI, itemsAPI, partiesAPI, deliveryConditionsAPI } from '../services/api';
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
  ex_plant_name?: string;
  broker_name?: string;
}

interface Item {
  id: number;
  item_name: string;
}

interface Party {
  id: number;
  party_name: string;
}

export default function AllTradesReportsScreen() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filter states
  const [transactionType, setTransactionType] = useState<string>('');
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectAllItems, setSelectAllItems] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [deliveryConditionId, setDeliveryConditionId] = useState<string>('');

  // Data for dropdowns
  const [items, setItems] = useState<Item[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [deliveryConditions, setDeliveryConditions] = useState<any[]>([]);

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
      const [itemsResponse, partiesResponse, deliveryConditionsResponse] = await Promise.all([
        itemsAPI.getAll(),
        partiesAPI.getAll(),
        deliveryConditionsAPI.getAll(),
      ]);
      setItems(itemsResponse.data);
      setParties(partiesResponse.data);
      setDeliveryConditions(deliveryConditionsResponse.data);
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
      
      if (selectedParty) {
        params.party_id = selectedParty;
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

      if (deliveryConditionId) {
        params.delivery_condition_id = deliveryConditionId;
      }

      const response = await reportAPI.getAllTrades(params);
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
    setSelectedParty('');
    setSelectedItems([]);
    setSelectAllItems(false);
    setStartDate('');
    setEndDate('');
    setDeliveryConditionId('');
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
        report_type: 'all-trades',
      };
      
      if (transactionType) {
        const selectedType = transactionTypes.find(t => t.id.toString() === transactionType);
        if (selectedType) {
          exportParams.transaction_type = selectedType.name.toLowerCase();
        }
      }
      
      if (selectedParty) {
        exportParams.party_id = selectedParty;
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

      if (deliveryDueDateStart) {
        exportParams.delivery_due_date_start = deliveryDueDateStart;
      }

      if (deliveryDueDateEnd) {
        exportParams.delivery_due_date_end = deliveryDueDateEnd;
      }

      if (deliveryConditionId) {
        exportParams.delivery_condition_id = deliveryConditionId;
      }

      const response = format === 'pdf' 
        ? await reportAPI.exportPDF(exportParams)
        : await reportAPI.exportExcel(exportParams);

      // Create a temporary file
      const fileName = format === 'excel' ? 'all-trades-report.xls' : `all-trades-report.${format}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Convert blob to base64 string
      const reader = new FileReader();
      const blob = response.data;
      
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const base64Data = await base64Promise;
      
      // Write the base64 data to file
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: format === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel',
          dialogTitle: `All Trades Report - ${format.toUpperCase()}`,
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
    // Remove "20" prefix if it exists at the beginning
    if (saudaNo.startsWith('20')) {
      return saudaNo.substring(2);
    }
    return saudaNo;
  };

  const renderReportItem = ({ item }: { item: ReportData }) => (
    <Card style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportIcon}>
          <Ionicons
            name={item.transaction_type === 'purchase' ? 'trending-up' : 'trending-down'}
            size={24}
            color={item.transaction_type === 'purchase' ? '#2ECC71' : '#E74C3C'}
          />
        </View>
        <View style={styles.reportInfo}>
          <Text style={styles.saudaNo}>{formatSaudaNumber(item.sauda_no)}</Text>
          <Text style={styles.partyName}>{item.party_name}</Text>
          <Text style={styles.itemDetails}>
            {item.item_name} • {item.quantity_packs} packs • {formatCurrency(item.rate_per_10kg)}
          </Text>
        </View>
        <View style={styles.reportValues}>
          <Text style={styles.totalValue}>{formatCurrency(item.total_value)}</Text>
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        </View>
      </View>
      {item.loading_status && (
        <View style={styles.loadingStatus}>
          <Text style={[
            styles.statusText,
            { color: item.loading_status === 'completed' ? '#2ECC71' : '#F39C12' }
          ]}>
            Loading: {item.loading_status}
          </Text>
        </View>
      )}
    </Card>
  );

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
          <Text style={styles.title}>All Trades</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.headerButton}>
              <Ionicons name="filter-outline" size={24} color="#0F4C75" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowExportModal(true)} style={styles.headerButton}>
            <Ionicons name="download-outline" size={24} color="#0F4C75" />
          </TouchableOpacity>
          </View>
        </View>

        {/* Active Filters Summary */}
        {(transactionType || selectedParty || selectedItems.length > 0 || startDate || endDate || deliveryConditionId) && (
          <Card style={styles.filtersCard}>
            <Text style={styles.filtersTitle}>Active Filters:</Text>
            {transactionType && (
              <Text style={styles.filterText}>
                Type: {transactionTypes.find(t => t.id.toString() === transactionType)?.name}
              </Text>
            )}
            {selectedParty && (
              <Text style={styles.filterText}>
                Party: {parties.find(p => p.id.toString() === selectedParty)?.party_name}
              </Text>
            )}
            {selectedItems.length > 0 && (
              <Text style={styles.filterText}>
                Items: {selectedItems.length} selected
              </Text>
            )}
            {startDate && <Text style={styles.filterText}>From Date: {startDate}</Text>}
            {endDate && <Text style={styles.filterText}>To Date: {endDate}</Text>}
            {deliveryConditionId && (
              <Text style={styles.filterText}>
                Delivery Condition: {deliveryConditions.find(dc => dc.id.toString() === deliveryConditionId)?.condition_name || 'N/A'}
              </Text>
            )}
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

                {/* Party */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Party Name</Text>
                  <SearchableDropdown
                    label="Party"
                    value={selectedParty}
                    placeholder="Select party"
                    items={parties}
                    onSelect={(id) => setSelectedParty(id)}
                  />
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

                {/* Delivery Condition */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Delivery Condition</Text>
                  <SearchableDropdown
                    label="Delivery Condition"
                    value={deliveryConditionId}
                    placeholder="Select delivery condition"
                    items={deliveryConditions}
                    onSelect={(id) => setDeliveryConditionId(id)}
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
  reportCard: {
    marginBottom: 12,
    padding: 16,
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
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
  filterScrollView: {
    maxHeight: 400,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectAllText: {
    fontSize: 14,
    color: '#0F4C75',
    fontWeight: '600',
  },
  checkboxList: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 8,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  checkboxText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  noItemsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    padding: 16,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  tableCard: {
    padding: 0,
    overflow: 'hidden',
  },
  tableContainer: {
    minWidth: 1200,
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