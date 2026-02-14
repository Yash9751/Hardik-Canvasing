import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, Stack } from 'expo-router';
import { saudaAPI, deliveryConditionsAPI } from '../../services/api';
import { useCompanyProfile } from '../../contexts/CompanyProfileContext';
import Card from '../../components/Card';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import DateTimePicker from '@react-native-community/datetimepicker';
import SearchableDropdown from '../../components/dropdowns/SearchableDropdown';

interface Sauda {
  id: number;
  sauda_no: string;
  transaction_type: 'purchase' | 'sell';
  date: string;
  party_id?: number;
  party_name: string;
  party_mobile?: string;
  party_city?: string;
  party_gstin?: string;
  item_id?: number;
  item_name: string;
  ex_plant_id?: number;
  ex_plant_name: string;
  quantity_packs: number;
  rate_per_10kg: number;
  total_value: number;
  broker_id?: number;
  broker_name: string;
  delivery_condition_id?: number;
  delivery_condition: string;
  payment_condition_id?: number;
  payment_condition: string;
  loading_due_date: string;
  remarks?: string;
}

export default function SaudaSettingsScreen() {
  const { companyProfile } = useCompanyProfile();
  const [saudaList, setSaudaList] = useState<Sauda[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'purchase' | 'sell'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [deliveryConditionId, setDeliveryConditionId] = useState<string>('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSauda, setSelectedSauda] = useState<Set<number>>(new Set());
  const [pendingMessages, setPendingMessages] = useState<{saudaList: Sauda[], currentIndex: number} | null>(null);
  
  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // Delivery conditions for dropdown
  const [deliveryConditions, setDeliveryConditions] = useState<any[]>([]);


  const fetchSauda = async () => {
    try {
      const params: any = {};
      
      if (startDate) {
        params.start_date = startDate;
      }
      
      if (endDate) {
        params.end_date = endDate;
      }
      
      if (deliveryConditionId) {
        params.delivery_condition_id = deliveryConditionId;
      }
      
      const response = await saudaAPI.getAll(params);
      setSaudaList(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load sauda transactions');
      console.error('Sauda error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDeliveryConditions = async () => {
    try {
      const response = await deliveryConditionsAPI.getAll();
      setDeliveryConditions(response.data);
    } catch (error) {
      console.error('Error fetching delivery conditions:', error);
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setStartDate(selectedDate.toISOString().split('T')[0]);
    } else if (Platform.OS === 'ios') {
      setShowStartDatePicker(false);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setEndDate(selectedDate.toISOString().split('T')[0]);
    } else if (Platform.OS === 'ios') {
      setShowEndDatePicker(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchSauda();
      fetchDeliveryConditions();
      
      // Check if there are pending messages to continue
      if (pendingMessages) {
        const { saudaList, currentIndex } = pendingMessages;
        if (currentIndex < saudaList.length) {
          // Wait a moment for the app to fully focus, then continue
          setTimeout(() => {
            sendMessagesSequentially(saudaList, currentIndex);
          }, 500);
        }
      }
    }, [pendingMessages])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSauda();
  };

  // Selection mode functions
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedSauda(new Set());
      setPendingMessages(null); // Clear any pending messages when exiting selection mode
    }
  };

  const toggleSaudaSelection = (saudaId: number) => {
    const newSelected = new Set(selectedSauda);
    if (newSelected.has(saudaId)) {
      newSelected.delete(saudaId);
    } else {
      newSelected.add(saudaId);
    }
    setSelectedSauda(newSelected);
  };

  const selectAllSauda = () => {
    const allIds = filteredSauda.map(sauda => sauda.id);
    setSelectedSauda(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedSauda(new Set());
  };

  const handleSendSelectedMessages = async () => {
    if (selectedSauda.size === 0) {
      Alert.alert('No Selection', 'Please select at least one sauda to send messages.');
      return;
    }

    const selectedSaudaList = filteredSauda.filter(sauda => selectedSauda.has(sauda.id));
    const validSaudaList = selectedSaudaList.filter(sauda => sauda.party_mobile);

    if (validSaudaList.length === 0) {
      Alert.alert('No Valid Numbers', 'None of the selected sauda have valid phone numbers.');
      return;
    }

    Alert.alert(
      'Send Messages',
      `Send WhatsApp messages to ${validSaudaList.length} selected parties?\n\nNote: You'll need to return to the app after each message to continue.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send', 
          onPress: () => {
            sendMessagesSequentially(validSaudaList, 0);
          }
        }
      ]
    );
  };

  const sendMessagesSequentially = async (saudaList: Sauda[], currentIndex: number) => {
    if (currentIndex >= saudaList.length) {
      // All messages sent
      Alert.alert('Complete', `Successfully sent ${saudaList.length} messages!`);
      setSelectionMode(false);
      setSelectedSauda(new Set());
      setPendingMessages(null);
      return;
    }

    const currentSauda = saudaList[currentIndex];
    const remainingCount = saudaList.length - currentIndex;

    Alert.alert(
      `Message ${currentIndex + 1} of ${saudaList.length}`,
      `Sending message to ${currentSauda.party_name} (${currentSauda.party_mobile})\n\n${remainingCount - 1} more message${remainingCount - 1 !== 1 ? 's' : ''} remaining.\n\nReturn to this app after sending to continue.`,
      [
        { text: 'Skip', onPress: () => {
          setPendingMessages({ saudaList, currentIndex: currentIndex + 1 });
        }},
        { 
          text: 'Send', 
          onPress: () => {
            handleShareOnWhatsApp(currentSauda);
            // Set pending messages for when user returns to app
            setPendingMessages({ saudaList, currentIndex: currentIndex + 1 });
          }
        }
      ]
    );
  };

  const handleEdit = (sauda: Sauda) => {
    // Navigate to the appropriate edit form based on transaction type
    if (sauda.transaction_type === 'purchase') {
      router.push({
        pathname: '/add-buy',
        params: { 
          edit: 'true',
          id: sauda.id.toString(),
          sauda_no: sauda.sauda_no,
          date: sauda.date,
          party_id: sauda.party_id?.toString() || '',
          item_id: sauda.item_id?.toString() || '',
          quantity_packs: sauda.quantity_packs.toString(),
          rate_per_10kg: sauda.rate_per_10kg.toString(),
          ex_plant_id: sauda.ex_plant_id?.toString() || '',
          broker_id: sauda.broker_id?.toString() || '',
          delivery_condition_id: sauda.delivery_condition_id?.toString() || '',
          payment_condition_id: sauda.payment_condition_id?.toString() || '',
          loading_due_date: sauda.loading_due_date || '',
          remarks: sauda.remarks || ''
        }
      });
    } else {
      router.push({
        pathname: '/add-sell',
        params: { 
          edit: 'true',
          id: sauda.id.toString(),
          sauda_no: sauda.sauda_no,
          date: sauda.date,
          party_id: sauda.party_id?.toString() || '',
          item_id: sauda.item_id?.toString() || '',
          quantity_packs: sauda.quantity_packs.toString(),
          rate_per_10kg: sauda.rate_per_10kg.toString(),
          ex_plant_id: sauda.ex_plant_id?.toString() || '',
          broker_id: sauda.broker_id?.toString() || '',
          delivery_condition_id: sauda.delivery_condition_id?.toString() || '',
          payment_condition_id: sauda.payment_condition_id?.toString() || '',
          loading_due_date: sauda.loading_due_date || '',
          remarks: sauda.remarks || ''
        }
      });
    }
  };

  const handleDelete = (sauda: Sauda) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete sauda "${sauda.sauda_no}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await saudaAPI.delete(sauda.id);
              fetchSauda();
              Alert.alert('Success', 'Transaction deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
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

  const filteredSauda = saudaList.filter(sauda => {
    const matchesSearch = 
      sauda.sauda_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sauda.party_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sauda.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sauda.ex_plant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sauda.date.includes(searchQuery) ||
      formatDate(sauda.date).includes(searchQuery);
    
    const matchesFilter = filterType === 'all' || sauda.transaction_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  // Share sauda note on WhatsApp
  const handleShareOnWhatsApp = async (sauda: Sauda) => {
    try {
      if (!sauda.party_mobile) {
        Alert.alert('No Phone Number', 'Party phone number is not available for this transaction.');
        return;
      }

      // Clean the phone number (remove spaces, dashes, etc.)
      const cleanPhone = sauda.party_mobile.replace(/[\s\-\(\)]/g, '');
      
      // Add country code if not present (assuming India +91)
      let phoneWithCode = cleanPhone;
      if (!cleanPhone.startsWith('91') && !cleanPhone.startsWith('+91')) {
        phoneWithCode = `91${cleanPhone}`;
      }
      if (phoneWithCode.startsWith('91') && !phoneWithCode.startsWith('+')) {
        phoneWithCode = `+${phoneWithCode}`;
      }

      // Create WhatsApp message in the exact format requested
      const contractNumber = sauda.sauda_no.replace(/^20/, ''); // Remove "20" prefix
      const quantity = `${sauda.quantity_packs} MT`;
      const rate = `${sauda.rate_per_10kg} (Per 10KGs) + GST`;
      const delivery = sauda.delivery_condition || 'Ready to Weekly';
      const payment = sauda.payment_condition || '2 nd Day';
      const loadingDate = sauda.loading_due_date ? formatDate(sauda.loading_due_date) : 'N/A';
      const remarks = ''; // Add remarks field if available
      
      // Determine seller and buyer based on transaction type
      const companyName = companyProfile?.company_name || 'Traders';
      const companyCity = 'City'; // CompanyProfile does not include a city field currently
      
      let seller, buyer;
      if (sauda.transaction_type === 'sell') {
        seller = `${companyName} (${companyCity})`;
        buyer = `${sauda.party_name} (${sauda.party_city || 'City'})`;
      } else {
        seller = `${sauda.party_name} (${sauda.party_city || 'City'})`;
        buyer = `${companyName} (${companyCity})`;
      }
      
      const gstin = sauda.transaction_type === 'sell' ? 'Buyer GSTIN' : 'Seller GSTIN';
      const gstinValue = sauda.party_gstin || 'N/A';
      const phoneNumber = companyProfile?.mobile_number || '';
      
      const message = `Please Find Contract Confirmation Sir

Sauda Date : ${formatDate(sauda.date)}
Sauda No : ${contractNumber}

Seller : ${seller}
Buyer : ${buyer}

Item : ${sauda.item_name}
Qty. : ${quantity}
Rate : ${rate}

Del. : ${delivery}
Pay. : ${payment}

Note : ${remarks}
Please Try to Load Before : ${loadingDate}
${gstin} : ${gstinValue}

(Reply with Ok).
*If any mistake, Reply!*
Call - ${phoneNumber}`;

      // Send message directly to WhatsApp
      const whatsappUrl = `whatsapp://send?phone=${phoneWithCode}&text=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to web WhatsApp
        const webWhatsappUrl = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webWhatsappUrl);
      }
    } catch (error: any) {
      console.error('WhatsApp sharing error:', error);
      Alert.alert('Error', 'Failed to open WhatsApp. Please try again or check if WhatsApp is installed.');
    }
  };



  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading sauda transactions...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.title}>Sauda Transactions</Text>
        <TouchableOpacity onPress={toggleSelectionMode} style={styles.selectionButton}>
          <Ionicons 
            name={selectionMode ? "checkmark-circle" : "checkbox-outline"} 
            size={24} 
            color={selectionMode ? "#0F4C75" : "#6B7280"} 
          />
        </TouchableOpacity>
      </View>

      {/* Selection Controls */}
      {selectionMode && (
        <View style={styles.selectionControls}>
          <Card>
            <View style={styles.selectionControlsContent}>
              <View style={styles.selectionInfo}>
                <Text style={styles.selectionText}>
                  {selectedSauda.size} selected
                  {pendingMessages && (
                    <Text style={styles.pendingText}>
                      {'\n'}Pending: {pendingMessages.saudaList.length - pendingMessages.currentIndex} messages
                    </Text>
                  )}
                </Text>
              </View>
              <View style={styles.selectionButtons}>
                <TouchableOpacity 
                  style={styles.selectionActionButton}
                  onPress={selectAllSauda}
                >
                  <Text style={styles.selectionActionText}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.selectionActionButton}
                  onPress={clearSelection}
                >
                  <Text style={styles.selectionActionText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.selectionActionButton, styles.sendButton]}
                  onPress={handleSendSelectedMessages}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                  <Text style={[styles.selectionActionText, styles.sendButtonText]}>
                    Send ({selectedSauda.size})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <Card>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search sauda, party, item..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </Card>
        </View>



        {/* Filter Tabs */}
        <View style={styles.filterSection}>
          <Card>
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[styles.filterTab, filterType === 'all' && styles.filterTabActive]}
                onPress={() => setFilterType('all')}
              >
                <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, filterType === 'purchase' && styles.filterTabActive]}
                onPress={() => setFilterType('purchase')}
              >
                <Ionicons 
                  name="trending-up" 
                  size={16} 
                  color={filterType === 'purchase' ? '#FFFFFF' : '#2ECC71'} 
                />
                <Text style={[styles.filterText, filterType === 'purchase' && styles.filterTextActive]}>
                  Purchase
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, filterType === 'sell' && styles.filterTabActive]}
                onPress={() => setFilterType('sell')}
              >
                <Ionicons 
                  name="trending-down" 
                  size={16} 
                  color={filterType === 'sell' ? '#FFFFFF' : '#E74C3C'} 
                />
                <Text style={[styles.filterText, filterType === 'sell' && styles.filterTextActive]}>
                  Sell
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Date Range Filter */}
        <View style={styles.filterSection}>
          <Card>
            <View style={styles.dateFilterContainer}>
              <Text style={styles.filterLabel}>Date Range</Text>
              <View style={styles.dateInputRow}>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={[styles.dateInputText, !startDate && styles.placeholderText]}>
                    {startDate || 'From Date'}
                  </Text>
                  <Ionicons name="calendar" size={20} color="#6B7280" />
                </TouchableOpacity>
                {showStartDatePicker && (
                  <DateTimePicker
                    value={startDate ? new Date(startDate + 'T00:00:00') : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleStartDateChange}
                  />
                )}
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={[styles.dateInputText, !endDate && styles.placeholderText]}>
                    {endDate || 'To Date'}
                  </Text>
                  <Ionicons name="calendar" size={20} color="#6B7280" />
                </TouchableOpacity>
                {showEndDatePicker && (
                  <DateTimePicker
                    value={endDate ? new Date(endDate + 'T00:00:00') : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleEndDateChange}
                  />
                )}
                <TouchableOpacity
                  style={styles.applyFilterButton}
                  onPress={fetchSauda}
                >
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                {(startDate || endDate) && (
                  <TouchableOpacity
                    style={styles.clearFilterButton}
                    onPress={() => {
                      setStartDate('');
                      setEndDate('');
                      fetchSauda();
                    }}
                  >
                    <Ionicons name="close" size={20} color="#E74C3C" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Card>
        </View>

        {/* Delivery Condition Filter */}
        <View style={styles.filterSection}>
          <Card>
            <View style={styles.deliveryFilterContainer}>
              <Text style={styles.filterLabel}>Delivery Condition</Text>
              <SearchableDropdown
                label="Delivery Condition"
                value={deliveryConditionId}
                placeholder="Select delivery condition"
                items={deliveryConditions}
                onSelect={(id) => {
                  setDeliveryConditionId(id);
                  // Auto-apply filter when selected
                  setTimeout(() => fetchSauda(), 100);
                }}
              />
              {deliveryConditionId && (
                <TouchableOpacity
                  style={styles.clearFilterButtonInline}
                  onPress={() => {
                    setDeliveryConditionId('');
                    fetchSauda();
                  }}
                >
                  <Text style={styles.clearFilterText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        </View>

        {/* Sauda List */}
        <View style={styles.saudaSection}>
          {filteredSauda.map((sauda) => (
            <Card key={sauda.id} style={styles.saudaCard}>
              <View style={styles.saudaHeader}>
                {selectionMode && (
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => toggleSaudaSelection(sauda.id)}
                  >
                    <Ionicons 
                      name={selectedSauda.has(sauda.id) ? "checkmark-circle" : "ellipse-outline"} 
                      size={24} 
                      color={selectedSauda.has(sauda.id) ? "#0F4C75" : "#6B7280"} 
                    />
                  </TouchableOpacity>
                )}
                <View style={styles.saudaInfo}>
                  <View style={styles.saudaTopRow}>
                    <Text style={styles.saudaNo}>{formatSaudaNumber(sauda.sauda_no)}</Text>
                    <View style={[
                      styles.typeBadge,
                      sauda.transaction_type === 'purchase' ? styles.purchaseBadge : styles.sellBadge
                    ]}>
                      <Ionicons 
                        name={sauda.transaction_type === 'purchase' ? 'trending-up' : 'trending-down'} 
                        size={12} 
                        color="#FFFFFF" 
                      />
                      <Text style={styles.typeText}>
                        {sauda.transaction_type.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.saudaDate}>{formatDate(sauda.date)}</Text>
                </View>
                {!selectionMode && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEdit(sauda)}
                    >
                      <Ionicons name="create" size={16} color="#0F4C75" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(sauda)}
                    >
                      <Ionicons name="trash" size={16} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.saudaDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Party:</Text>
                  <Text style={styles.detailValue}>{sauda.party_name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Item:</Text>
                  <Text style={styles.detailValue}>{sauda.item_name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Quantity:</Text>
                  <Text style={styles.detailValue}>{sauda.quantity_packs} MT</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Rate:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(sauda.rate_per_10kg)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Value:</Text>
                  <Text style={[styles.detailValue, styles.totalValue]}>
                    {formatCurrency(sauda.total_value)}
                  </Text>
                </View>
              </View>
              {!selectionMode && (
                <View style={styles.actionButtonsContainer}>
                  {sauda.party_mobile && (
                    <TouchableOpacity
                      style={styles.whatsappButton}
                      onPress={() => handleShareOnWhatsApp(sauda)}
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                      <Text style={styles.whatsappButtonText}>Send Message</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => router.push(`/view-sauda?id=${sauda.id}`)}
                  >
                    <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.viewButtonText}>View Sauda</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          ))}
        </View>

        {filteredSauda.length === 0 && (
          <View style={styles.emptySection}>
            <Card>
              <View style={styles.emptyContent}>
                <Ionicons name="document-outline" size={48} color="#6B7280" />
                <Text style={styles.emptyText}>
                  {searchQuery || filterType !== 'all'
                    ? 'No transactions found' 
                    : 'No sauda transactions available'}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  searchSection: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 4,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  filterTabActive: {
    backgroundColor: '#0F4C75',
  },
  dateFilterContainer: {
    padding: 12,
  },
  deliveryFilterContainer: {
    padding: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInputText: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  applyFilterButton: {
    backgroundColor: '#0F4C75',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearFilterButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearFilterButtonInline: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  clearFilterText: {
    fontSize: 14,
    color: '#E74C3C',
    fontWeight: '600',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  saudaSection: {
    padding: 16,
    paddingBottom: 32,
  },
  saudaCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  saudaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  saudaInfo: {
    flex: 1,
  },
  saudaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  saudaNo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  purchaseBadge: {
    backgroundColor: '#2ECC71',
  },
  sellBadge: {
    backgroundColor: '#E74C3C',
  },
  typeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 2,
  },
  saudaDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#E8F6FF',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  saudaDetails: {
    gap: 8,
    marginTop: 8,
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
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F4C75',
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
  actionButtonsContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 4,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 110,
    justifyContent: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F4C75',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 110,
    justifyContent: 'center',
    shadowColor: '#0F4C75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  // Selection mode styles
  selectionButton: {
    padding: 8,
    width: 40,
  },
  selectionControls: {
    padding: 16,
    paddingTop: 8,
  },
  selectionControlsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionInfo: {
    flex: 1,
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  selectionActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  sendButton: {
    backgroundColor: '#25D366',
  },
  sendButtonText: {
    color: '#FFFFFF',
  },
  checkboxContainer: {
    padding: 4,
    marginRight: 8,
  },

}); 