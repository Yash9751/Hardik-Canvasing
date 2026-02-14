import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import SearchableDropdown from '../dropdowns/SearchableDropdown';
import AddEntityModal from '../modals/AddEntityModal';
import { saudaAPI, partiesAPI, itemsAPI, exPlantsAPI, brokersAPI, deliveryConditionsAPI, paymentConditionsAPI } from '../../services/api';
import { API_CONFIG } from '../../config/api';

interface PurchaseSellFormProps {
  type: 'purchase' | 'sell';
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
}

export default function PurchaseSellForm({ type, onSuccess, onCancel, initialData }: PurchaseSellFormProps) {
  const [loading, setLoading] = useState(false);
  const [generatingNumber, setGeneratingNumber] = useState(false);
  
  // Form data for Purchase/Sell transaction
  const [formData, setFormData] = useState({
    saudaNumber: '', // Auto-generated unique identifier
    partyId: '',
    itemId: '',
    exPlantId: '',
    brokerId: '',
    deliveryConditionId: '',
    paymentConditionId: '',
    deliveryType: '',
    quantity: '',
    rate: '',
    date: new Date().toISOString().split('T')[0],
    loadingDueDate: '',
    remarks: '',
  });

  // Dropdown data
  const [parties, setParties] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [exPlants, setExPlants] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [deliveryConditions, setDeliveryConditions] = useState<any[]>([]);
  const [paymentConditions, setPaymentConditions] = useState<any[]>([]);

  // Modal states
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showExPlantModal, setShowExPlantModal] = useState(false);
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLoadingDueDatePicker, setShowLoadingDueDatePicker] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const fieldPositionsRef = useRef<{ [key: string]: number }>({});

  // Load initial data
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Load dropdown data when form comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadDropdownData();
      if (!initialData?.saudaNumber) {
        generateSaudaNumber();
      }
    }, [])
  );

  const loadDropdownData = async () => {
    try {
      const [
        partiesRes,
        itemsRes,
        exPlantsRes,
        brokersRes,
        deliveryConditionsRes,
        paymentConditionsRes
      ] = await Promise.all([
        partiesAPI.getAll(),
        itemsAPI.getAll(),
        exPlantsAPI.getAll(),
        brokersAPI.getAll(),
        deliveryConditionsAPI.getAll(),
        paymentConditionsAPI.getAll()
      ]);

      setParties(partiesRes.data);
      setItems(itemsRes.data);
      setExPlants(exPlantsRes.data);
      setBrokers(brokersRes.data);
      setDeliveryConditions(deliveryConditionsRes.data);
      setPaymentConditions(paymentConditionsRes.data);

      // Set a default party (first entry) if available
      setDefaultParty(partiesRes.data);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
      Alert.alert('Error', 'Failed to load form data');
    }
  };

  const setDefaultParty = (partiesList: any[]) => {
    const firstParty = partiesList?.[0];
    if (firstParty?.id) setFormData(prev => ({ ...prev, partyId: firstParty.id.toString() }));
  };

  const generateSaudaNumber = async () => {
    setGeneratingNumber(true);
    try {
      const response = await saudaAPI.getNextNumber();
      setFormData(prev => ({ ...prev, saudaNumber: response.data.sauda_no }));
    } catch (error) {
      console.error('Error generating sauda number:', error);
    } finally {
      setGeneratingNumber(false);
    }
  };

  const handleAddParty = async (data: any) => {
    try {
      const response = await partiesAPI.create({
        party_name: data.name,
        city: data.city,
        gst_no: data.gstNo,
        contact_person: data.contactPerson,
        mobile_number: data.mobileNumber,
        email: data.email,
        party_type: data.partyType,
      });
      setParties(prev => [...prev, response.data]);
      setFormData(prev => ({ ...prev, partyId: response.data.id.toString() }));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add party');
    }
  };

  const handleAddItem = async (data: any) => {
    try {
      const response = await itemsAPI.create({
        item_name: data.name,
        nick_name: data.nickName,
        hsn_code: data.hsnCode,
      });
      setItems(prev => [...prev, response.data]);
      setFormData(prev => ({ ...prev, itemId: response.data.id.toString() }));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add item');
    }
  };

  const handleAddExPlant = async (data: any) => {
    try {
      const response = await exPlantsAPI.create({ plant_name: data.name });
      setExPlants(prev => [...prev, response.data]);
      setFormData(prev => ({ ...prev, exPlantId: response.data.id.toString() }));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add ex plant');
    }
  };

  const handleAddBroker = async (data: any) => {
    try {
      const response = await brokersAPI.create({ broker_name: data.name });
      setBrokers(prev => [...prev, response.data]);
      setFormData(prev => ({ ...prev, brokerId: response.data.id.toString() }));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add broker');
    }
  };

  const handleAddDeliveryCondition = async (data: any) => {
    try {
      const response = await deliveryConditionsAPI.create({ condition_name: data.name });
      setDeliveryConditions(prev => [...prev, response.data]);
      setFormData(prev => ({ ...prev, deliveryConditionId: response.data.id.toString() }));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add delivery condition');
    }
  };

  const handleAddPaymentCondition = async (data: any) => {
    try {
      const response = await paymentConditionsAPI.create({ condition_name: data.name });
      setPaymentConditions(prev => [...prev, response.data]);
      setFormData(prev => ({ ...prev, paymentConditionId: response.data.id.toString() }));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add payment condition');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en', { month: 'short' }).substring(0, 3);
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const parseDate = (dateString: string) => {
    // Parse date from "DD MMM YYYY" format
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const parts = dateString.toLowerCase().split(' ');
    if (parts.length >= 3) {
      const day = parseInt(parts[0]);
      const month = months.indexOf(parts[1]) + 1;
      const year = parseInt(parts[2]);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      }
    }
    return dateString;
  };

  const handleDateChange = (field: string, value: string) => {
    const formattedDate = parseDate(value);
    setFormData(prev => ({ ...prev, [field]: formattedDate }));
  };

  const handleDateChangePicker = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const isoDate = selectedDate.toISOString().split('T')[0];
      updateFormData('date', isoDate);
      generateSaudaNumber();
    }
  };

  const handleLoadingDueDateChangePicker = (event: any, selectedDate?: Date) => {
    setShowLoadingDueDatePicker(false);
    if (selectedDate) {
      const isoDate = selectedDate.toISOString().split('T')[0];
      updateFormData('loadingDueDate', isoDate);
    }
  };

  const validateForm = () => {
    if (!formData.partyId) {
      Alert.alert('Error', 'Please select a party');
      return false;
    }
    if (!formData.itemId) {
      Alert.alert('Error', 'Please select an item');
      return false;
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return false;
    }
    if (!formData.rate || parseFloat(formData.rate) <= 0) {
      Alert.alert('Error', 'Please enter a valid rate');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const transactionData = {
        sauda_no: formData.saudaNumber,
        transaction_type: type,
        date: formData.date,
        party_id: parseInt(formData.partyId),
        item_id: parseInt(formData.itemId),
        ex_plant_id: formData.exPlantId ? parseInt(formData.exPlantId) : null,
        broker_id: formData.brokerId ? parseInt(formData.brokerId) : null,
        delivery_condition_id: formData.deliveryConditionId ? parseInt(formData.deliveryConditionId) : null,
        payment_condition_id: formData.paymentConditionId ? parseInt(formData.paymentConditionId) : null,
        delivery_type: formData.deliveryType || null,
        quantity_packs: parseFloat(formData.quantity),
        rate_per_10kg: parseFloat(formData.rate),
        loading_due_date: formData.loadingDueDate || null,
        remarks: formData.remarks,
      };
      console.log('Submitting transaction:', transactionData);
      if (initialData?.id) {
        await saudaAPI.update(initialData.id, transactionData);
        Alert.alert('Success', `${type === 'purchase' ? 'Purchase' : 'Sell'} transaction updated successfully`);
      } else {
        await saudaAPI.create(transactionData);
        Alert.alert('Success', `${type === 'purchase' ? 'Purchase' : 'Sell'} transaction added successfully`);
      }
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error ||
        error.response?.data?.message ||
        JSON.stringify(error.response?.data) ||
        'Failed to save transaction'
      );
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper to scroll to a field
  const scrollToField = (field: string) => {
    const y = fieldPositionsRef.current[field] || 0;
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: y - 20, animated: true });
    }
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Date */}
      

      <View style={styles.header}>
        <Text style={styles.title}>
          {initialData ? 'Edit' : 'Add'} {type === 'purchase' ? 'Purchase' : 'Sell'} Transaction
        </Text>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.form}>
        {/* Party */}
        <SearchableDropdown
          label={type === 'purchase' ? 'Seller Party' : 'Buyer Party'}
          value={formData.partyId}
          placeholder={`Select ${type === 'purchase' ? 'seller' : 'buyer'} party`}
          items={parties}
          onSelect={(id) => updateFormData('partyId', id)}
          onAddNew={() => setShowPartyModal(true)}
          required
        />


<View style={styles.formGroup} onLayout={event => { fieldPositionsRef.current.date = event.nativeEvent.layout.y; }}>
        <Text style={styles.label}>Date *</Text>
        <TouchableOpacity
          style={[styles.input, { flexDirection: 'row', alignItems: 'center', paddingRight: 12 }]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={{ flex: 1, color: '#1F2937', fontSize: 16 }}>{formatDate(formData.date)}</Text>
          <Ionicons name="calendar" size={20} color="#6B7280" />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={formData.date ? new Date(formData.date) : new Date()}
            mode="date"
            display="default"
            onChange={handleDateChangePicker}
          />
        )}
      </View>
      {/* Sauda Number (Auto-generated unique identifier) */}
      <View style={styles.formGroup} onLayout={event => { fieldPositionsRef.current.saudaNumber = event.nativeEvent.layout.y; }}>
        <Text style={styles.label}>Sauda Number</Text>
        <View style={styles.saudaNumberContainer}>
          <TextInput
            style={styles.saudaNumberInput}
            value={formData.saudaNumber}
            placeholder="Auto-generated unique ID"
            editable={false}
            selectTextOnFocus={false}
            onFocus={() => scrollToField('saudaNumber')}
          />
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={generateSaudaNumber}
            disabled={generatingNumber}
          >
            {generatingNumber ? (
              <ActivityIndicator size="small" color="#2ECC71" />
            ) : (
              <Ionicons name="refresh" size={20} color="#2ECC71" />
            )}
          </TouchableOpacity>
        </View>
      </View>

        {/* Item */}
        <SearchableDropdown
          label="Item"
          value={formData.itemId}
          placeholder="Select item"
          items={items}
          onSelect={(id) => updateFormData('itemId', id)}
          onAddNew={() => setShowItemModal(true)}
          required
        />

        {/* Quantity and Rate Row */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              style={styles.input}
              value={formData.quantity}
              onChangeText={(text) => updateFormData('quantity', text)}
              placeholder="1 pack = 1000 kg"
              keyboardType="numeric"
              onFocus={() => scrollToField('quantity')}
            />
          </View>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Rate per 10kg *</Text>
            <TextInput
              style={styles.input}
              value={formData.rate}
              onChangeText={(text) => updateFormData('rate', text)}
              placeholder="Enter rate per 10kg"
              keyboardType="numeric"
              onFocus={() => scrollToField('rate')}
            />
          </View>
        </View>

        {/* Delivery Condition */}
        <SearchableDropdown
          label="Delivery Condition"
          value={formData.deliveryConditionId}
          placeholder="Select delivery condition"
          items={deliveryConditions}
          onSelect={(id) => updateFormData('deliveryConditionId', id)}
          onAddNew={() => setShowDeliveryModal(true)}
        />

        {/* Delivery Type */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Delivery Type</Text>
          <View style={styles.deliveryTypeContainer}>
            <TouchableOpacity
              style={[
                styles.deliveryTypeButton,
                formData.deliveryType === 'FOR' && styles.deliveryTypeButtonActive
              ]}
              onPress={() => updateFormData('deliveryType', 'FOR')}
            >
              <Text style={[
                styles.deliveryTypeText,
                formData.deliveryType === 'FOR' && styles.deliveryTypeTextActive
              ]}>
                FOR
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deliveryTypeButton,
                formData.deliveryType === 'Ex' && styles.deliveryTypeButtonActive
              ]}
              onPress={() => updateFormData('deliveryType', 'Ex')}
            >
              <Text style={[
                styles.deliveryTypeText,
                formData.deliveryType === 'Ex' && styles.deliveryTypeTextActive
              ]}>
                Ex
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Condition */}
        <SearchableDropdown
          label="Payment Condition"
          value={formData.paymentConditionId}
          placeholder="Select payment condition"
          items={paymentConditions}
          onSelect={(id) => updateFormData('paymentConditionId', id)}
          onAddNew={() => setShowPaymentModal(true)}
        />

        {/* Loading Due Date */}
        <View style={styles.formGroup} onLayout={event => { fieldPositionsRef.current.loadingDueDate = event.nativeEvent.layout.y; }}>
          <Text style={styles.label}>Loading Due Date</Text>
          <TouchableOpacity
            style={[styles.input, { flexDirection: 'row', alignItems: 'center', paddingRight: 12 }]}
            onPress={() => setShowLoadingDueDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={{ flex: 1, color: '#1F2937', fontSize: 16 }}>{formData.loadingDueDate ? formatDate(formData.loadingDueDate) : ''}</Text>
            <Ionicons name="calendar" size={20} color="#6B7280" />
          </TouchableOpacity>
          {showLoadingDueDatePicker && (
            <DateTimePicker
              value={formData.loadingDueDate ? new Date(formData.loadingDueDate) : new Date()}
              mode="date"
              display="default"
              onChange={handleLoadingDueDateChangePicker}
            />
          )}
        </View>

        {/* Ex Plant */}
        <SearchableDropdown
          label="Ex Plant"
          value={formData.exPlantId}
          placeholder="Select ex plant"
          items={exPlants}
          onSelect={(id) => updateFormData('exPlantId', id)}
          onAddNew={() => setShowExPlantModal(true)}
        />

        {/* Broker */}
        <SearchableDropdown
          label="Broker"
          value={formData.brokerId}
          placeholder="Select broker"
          items={brokers}
          onSelect={(id) => updateFormData('brokerId', id)}
          onAddNew={() => setShowBrokerModal(true)}
        />

        {/* Remarks */}
        <View style={styles.formGroup} onLayout={event => { fieldPositionsRef.current.remarks = event.nativeEvent.layout.y; }}>
          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, { minHeight: 60 }]}
            value={formData.remarks}
            onChangeText={(text) => updateFormData('remarks', text)}
            multiline
            numberOfLines={3}
            onFocus={() => scrollToField('remarks')}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons 
                name={type === 'purchase' ? 'add-circle' : 'remove-circle'} 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.submitButtonText}>
                {initialData ? 'Update' : 'Add'} {type === 'purchase' ? 'Purchase' : 'Sell'} Transaction
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Add Entity Modals */}
      <AddEntityModal
        visible={showPartyModal}
        title="Add New Party"
        entityName="Party"
        entityType="party"
        onClose={() => setShowPartyModal(false)}
        onAdd={handleAddParty}
      />

      <AddEntityModal
        visible={showItemModal}
        title="Add New Item"
        entityName="Item"
        entityType="item"
        onClose={() => setShowItemModal(false)}
        onAdd={handleAddItem}
      />

      <AddEntityModal
        visible={showExPlantModal}
        title="Add New Ex Plant"
        entityName="Ex Plant"
        entityType="exPlant"
        onClose={() => setShowExPlantModal(false)}
        onAdd={handleAddExPlant}
      />

      <AddEntityModal
        visible={showBrokerModal}
        title="Add New Broker"
        entityName="Broker"
        entityType="broker"
        onClose={() => setShowBrokerModal(false)}
        onAdd={handleAddBroker}
      />

      <AddEntityModal
        visible={showDeliveryModal}
        title="Add New Delivery Condition"
        entityName="Delivery Condition"
        entityType="deliveryCondition"
        onClose={() => setShowDeliveryModal(false)}
        onAdd={handleAddDeliveryCondition}
      />

      <AddEntityModal
        visible={showPaymentModal}
        title="Add New Payment Condition"
        entityName="Payment Condition"
        entityType="paymentCondition"
        onClose={() => setShowPaymentModal(false)}
        onAdd={handleAddPaymentCondition}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  cancelButton: {
    padding: 8,
  },
  form: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  saudaNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saudaNumberInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  refreshButton: {
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: '#2ECC71',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deliveryTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  deliveryTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  deliveryTypeButtonActive: {
    backgroundColor: '#0F4C75',
    borderColor: '#0F4C75',
  },
  deliveryTypeText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  deliveryTypeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 