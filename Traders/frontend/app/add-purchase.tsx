import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { partiesAPI, itemsAPI, deliveryConditionsAPI, paymentConditionsAPI, exPlantsAPI, brokersAPI, saudaAPI } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';

interface Party {
  id: number;
  party_name: string;
  city: string;
  gst_no?: string;
  contact_person?: string;
  mobile_number: string;
  email?: string;
}

interface Item {
  id: number;
  name: string;
  description?: string;
  unit?: string;
}

interface DeliveryCondition {
  id: number;
  condition_name: string;
}

interface PaymentCondition {
  id: number;
  condition_name: string;
}

interface ExPlant {
  id: number;
  plant_name: string;
}

interface Broker {
  id: number;
  broker_name: string;
}

export default function AddPurchaseScreen() {
  const [formData, setFormData] = useState({
    date: new Date(),
    sauda_no: '',
    seller_party_id: '',
    seller_party_name: '',
    item_id: '',
    item_name: '',
    quantity_packs: '',
    rate_per_10kg: '',
    delivery_condition_id: '',
    delivery_condition_name: '',
    payment_condition_id: '',
    payment_condition_name: '',
    loading_due_date: '',
    ex_plant_id: '',
    ex_plant_name: '',
    broker_id: '',
    broker_name: '',
    remarks: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLoadingDatePicker, setShowLoadingDatePicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState('');
  const [loading, setLoading] = useState(false);

  // Data states
  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [deliveryConditions, setDeliveryConditions] = useState<DeliveryCondition[]>([]);
  const [paymentConditions, setPaymentConditions] = useState<PaymentCondition[]>([]);
  const [exPlants, setExPlants] = useState<ExPlant[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);

  // Filtered data for search
  const [filteredParties, setFilteredParties] = useState<Party[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [filteredDeliveryConditions, setFilteredDeliveryConditions] = useState<DeliveryCondition[]>([]);
  const [filteredPaymentConditions, setFilteredPaymentConditions] = useState<PaymentCondition[]>([]);
  const [filteredExPlants, setFilteredExPlants] = useState<ExPlant[]>([]);
  const [filteredBrokers, setFilteredBrokers] = useState<Broker[]>([]);

  useEffect(() => {
    fetchInitialData();
    generateSaudaNumber();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [
        partiesRes,
        itemsRes,
        deliveryConditionsRes,
        paymentConditionsRes,
        exPlantsRes,
        brokersRes
      ] = await Promise.all([
        partiesAPI.getAll(),
        itemsAPI.getAll(),
        deliveryConditionsAPI.getAll(),
        paymentConditionsAPI.getAll(),
        exPlantsAPI.getAll(),
        brokersAPI.getAll()
      ]);

      setParties(partiesRes.data);
      setItems(itemsRes.data);
      setDeliveryConditions(deliveryConditionsRes.data);
      setPaymentConditions(paymentConditionsRes.data);
      setExPlants(exPlantsRes.data);
      setBrokers(brokersRes.data);

      // Set filtered data
      setFilteredParties(partiesRes.data);
      setFilteredItems(itemsRes.data);
      setFilteredDeliveryConditions(deliveryConditionsRes.data);
      setFilteredPaymentConditions(paymentConditionsRes.data);
      setFilteredExPlants(exPlantsRes.data);
      setFilteredBrokers(brokersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load form data');
    }
  };

  const generateSaudaNumber = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const financialYear = `${currentYear.toString().slice(-2)}${(currentYear + 1).toString().slice(-2)}`;
      
      // For now, generate a simple number - this will be implemented in backend
      const nextNumber = Math.floor(Math.random() * 1000) + 1;
      
      setFormData(prev => ({
        ...prev,
        sauda_no: `${financialYear}/${nextNumber.toString().padStart(4, '0')}`
      }));
    } catch (error) {
      console.error('Error generating sauda number:', error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, date: selectedDate }));
      generateSaudaNumber();
    }
  };

  const handleLoadingDateChange = (event: any, selectedDate?: Date) => {
    setShowLoadingDatePicker(false);
    if (selectedDate) {
      const formattedDate = formatDateForInput(selectedDate);
      setFormData(prev => ({ ...prev, loading_due_date: formattedDate }));
    }
  };

  const formatDateForInput = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en', { month: 'short' }).substring(0, 3);
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const parseDateInput = (dateString: string) => {
    const parts = dateString.split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const monthStr = parts[1];
      const year = parseInt(parts[2]);
      
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIndex = months.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
      
      if (monthIndex !== -1 && !isNaN(day) && !isNaN(year)) {
        return new Date(year, monthIndex, day);
      }
    }
    return new Date();
  };

  const handleSearch = (query: string, type: string) => {
    setSearchQuery(query);
    
    switch (type) {
      case 'parties':
        const filteredP = parties.filter(party => 
          party.party_name.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredParties(filteredP);
        break;
      case 'items':
        const filteredI = items.filter(item => 
          item.name.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredItems(filteredI);
        break;
      case 'deliveryConditions':
        const filteredDC = deliveryConditions.filter(condition => 
          condition.condition_name.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredDeliveryConditions(filteredDC);
        break;
      case 'paymentConditions':
        const filteredPC = paymentConditions.filter(condition => 
          condition.condition_name.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredPaymentConditions(filteredPC);
        break;
      case 'exPlants':
        const filteredEP = exPlants.filter(plant => 
          plant.plant_name.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredExPlants(filteredEP);
        break;
      case 'brokers':
        const filteredB = brokers.filter(broker => 
          broker.broker_name.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredBrokers(filteredB);
        break;
    }
  };

  const handleSelectItem = (item: any, type: string) => {
    switch (type) {
      case 'parties':
        setFormData(prev => ({
          ...prev,
          seller_party_id: item.id.toString(),
          seller_party_name: item.party_name
        }));
        break;
      case 'items':
        setFormData(prev => ({
          ...prev,
          item_id: item.id.toString(),
          item_name: item.name
        }));
        break;
      case 'deliveryConditions':
        setFormData(prev => ({
          ...prev,
          delivery_condition_id: item.id.toString(),
          delivery_condition_name: item.condition_name
        }));
        break;
      case 'paymentConditions':
        setFormData(prev => ({
          ...prev,
          payment_condition_id: item.id.toString(),
          payment_condition_name: item.condition_name
        }));
        break;
      case 'exPlants':
        setFormData(prev => ({
          ...prev,
          ex_plant_id: item.id.toString(),
          ex_plant_name: item.plant_name
        }));
        break;
      case 'brokers':
        setFormData(prev => ({
          ...prev,
          broker_id: item.id.toString(),
          broker_name: item.broker_name
        }));
        break;
    }
    setShowDropdown('');
    setSearchQuery('');
  };

  const handleAddNew = (type: string) => {
    setModalType(type);
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.seller_party_name || !formData.item_name || !formData.quantity_packs || !formData.rate_per_10kg) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const purchaseData = {
        date: formData.date.toISOString().split('T')[0],
        sauda_no: formData.sauda_no,
        transaction_type: 'purchase',
        seller_party_id: parseInt(formData.seller_party_id),
        item_id: parseInt(formData.item_id),
        quantity_packs: parseInt(formData.quantity_packs),
        rate_per_10kg: parseFloat(formData.rate_per_10kg),
        delivery_condition_id: formData.delivery_condition_id ? parseInt(formData.delivery_condition_id) : null,
        payment_condition_id: formData.payment_condition_id ? parseInt(formData.payment_condition_id) : null,
        loading_due_date: formData.loading_due_date ? parseDateInput(formData.loading_due_date).toISOString().split('T')[0] : null,
        ex_plant_id: formData.ex_plant_id ? parseInt(formData.ex_plant_id) : null,
        broker_id: formData.broker_id ? parseInt(formData.broker_id) : null,
        remarks: formData.remarks,
      };

      await saudaAPI.create(purchaseData);
      Alert.alert('Success', 'Purchase added successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error adding purchase:', error);
      Alert.alert('Error', 'Failed to add purchase');
    } finally {
      setLoading(false);
    }
  };

  const renderDropdown = (type: string, data: any[], placeholder: string) => {
    const isVisible = showDropdown === type;
    const currentValue = formData[`${type === 'parties' ? 'seller_party_name' : type === 'items' ? 'item_name' : type === 'deliveryConditions' ? 'delivery_condition_name' : type === 'paymentConditions' ? 'payment_condition_name' : type === 'exPlants' ? 'ex_plant_name' : 'broker_name'}` as keyof typeof formData];

    return (
      <View style={styles.dropdownContainer}>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowDropdown(isVisible ? '' : type)}
        >
          <Text style={[styles.dropdownText, !currentValue && styles.placeholderText]}>
            {String(currentValue || placeholder)}
          </Text>
          <Ionicons name={isVisible ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
        </TouchableOpacity>

        {isVisible && (
          <View style={styles.dropdownList}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                value={searchQuery}
                onChangeText={(text) => handleSearch(text, type)}
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddNew(type)}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={data}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleSelectItem(item, type)}
                >
                  <Text style={styles.dropdownItemText}>{item.name || item.party_name || item.condition_name || item.plant_name || item.broker_name}</Text>
                </TouchableOpacity>
              )}
              style={styles.dropdownFlatList}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Purchase</Text>
      </View>

      <View style={styles.form}>
        {/* Date */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {formData.date.toLocaleDateString('en-IN')}
            </Text>
            <Ionicons name="calendar" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Sauda Number */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Sauda Number</Text>
          <TextInput
            style={styles.input}
            value={formData.sauda_no}
            editable={false}
            placeholder="Auto-generated"
          />
        </View>

        {/* Seller Party */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Seller Party *</Text>
          {renderDropdown('parties', filteredParties, 'Select seller party')}
        </View>

        {/* Item */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Item *</Text>
          {renderDropdown('items', filteredItems, 'Select item')}
        </View>

        {/* Quantity */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Quantity (Packs) *</Text>
          <TextInput
            style={styles.input}
            value={formData.quantity_packs}
            onChangeText={(text) => setFormData(prev => ({ ...prev, quantity_packs: text }))}
            placeholder="Enter quantity (1 pack = 1000 kg)"
            keyboardType="numeric"
          />
        </View>

        {/* Rate */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Rate (₹ per 10 kg) *</Text>
          <TextInput
            style={styles.input}
            value={formData.rate_per_10kg}
            onChangeText={(text) => setFormData(prev => ({ ...prev, rate_per_10kg: text }))}
            placeholder="Enter rate per 10 kg"
            keyboardType="numeric"
          />
        </View>

        {/* Delivery Condition */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Delivery Condition</Text>
          {renderDropdown('deliveryConditions', filteredDeliveryConditions, 'Select delivery condition')}
        </View>

        {/* Payment Condition */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Payment Condition</Text>
          {renderDropdown('paymentConditions', filteredPaymentConditions, 'Select payment condition')}
        </View>

        {/* Loading Due Date */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Loading Due Date</Text>
          <TextInput
            style={styles.input}
            value={formData.loading_due_date}
            onChangeText={(text) => setFormData(prev => ({ ...prev, loading_due_date: text }))}
            placeholder="e.g., 15 Jan 2025"
          />
        </View>

        {/* Ex Plant */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ex Plant</Text>
          {renderDropdown('exPlants', filteredExPlants, 'Select ex plant')}
        </View>

        {/* Broker */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Broker</Text>
          {renderDropdown('brokers', filteredBrokers, 'Select broker')}
        </View>

        {/* Remarks */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={formData.remarks}
            onChangeText={(text) => setFormData(prev => ({ ...prev, remarks: text }))}
            placeholder="Enter remarks (optional)"
            multiline
          />
        </View>

        {/* Submit Button */}
        <Button
          title={loading ? 'Adding Purchase...' : 'Add Purchase'}
          onPress={handleSubmit}
          disabled={loading}
          style={styles.submitButton}
        />
      </View>

      {/* Add New Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New {modalType}</Text>
            <Text style={styles.modalSubtitle}>This feature is coming soon...</Text>
            <Button
              title="Close"
              onPress={() => setShowAddModal(false)}
              variant="secondary"
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  form: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  dateButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
  },
  dropdownContainer: {
    position: 'relative',
  },
  dropdownButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 1000,
    maxHeight: 200,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#3282B8',
    borderRadius: 6,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
  },
  dropdownFlatList: {
    maxHeight: 150,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1F2937',
  },
  submitButton: {
    marginTop: 20,
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
    alignItems: 'center',
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
    textAlign: 'center',
  },
}); 