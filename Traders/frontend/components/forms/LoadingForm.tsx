import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import SearchableDropdown from '../dropdowns/SearchableDropdown';
import AddEntityModal from '../modals/AddEntityModal';
import { loadingAPI, saudaAPI, partiesAPI, itemsAPI, exPlantsAPI, transportsAPI } from '../../services/api';
import { API_CONFIG } from '../../config/api';

interface LoadingFormProps {
  type: 'purchase' | 'sell';
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
}

interface SaudaWithPending {
  id: number;
  sauda_no: string;
  date: string;
  quantity: number;
  rate: number;
  pending_quantity: number;
  party_name: string;
  item_name: string;
  item_id: number;
  ex_plant_id: number;
  party_id: number;
}

export default function LoadingForm({ type, onSuccess, onCancel, initialData }: LoadingFormProps) {
  const [loading, setLoading] = useState(false);
  
  // Form data for Loading operation on existing Sauda transaction
  const [formData, setFormData] = useState({
    saudaId: '', // Reference to existing Sauda transaction
    partyId: '',
    itemId: '',
    exPlantId: '',
    quantity: '',
    loadingDate: new Date().toISOString().split('T')[0],
    remarks: '',
    transportId: '', // New field for transport
    tankerNumber: '', // New field for tanker number
  });

  // Dropdown data
  const [saudaList, setSaudaList] = useState<SaudaWithPending[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [exPlants, setExPlants] = useState<any[]>([]);
  const [transports, setTransports] = useState<any[]>([]);

  // Modal states
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
    }, [])
  );

  const loadDropdownData = async () => {
    console.log('LoadingForm: loadDropdownData called. API base URL:', API_CONFIG.BASE_URL, 'type:', type);
    try {
      let saudaRes;
      try {
        // Use getPending API to get only sauda transactions with pending quantities
        saudaRes = await saudaAPI.getPending({ transaction_type: type });
        console.log('Raw sauda API response:', saudaRes.data);
      } catch (saudaError) {
        console.error('Error fetching sauda:', saudaError);
        saudaRes = { data: [] };
      }
      const [
        partiesRes,
        itemsRes,
        exPlantsRes,
        transportsRes
      ] = await Promise.all([
        partiesAPI.getAll(),
        itemsAPI.getAll(),
        exPlantsAPI.getAll(),
        transportsAPI.getAll()
      ]);

      // Calculate pending quantities for existing Sauda transactions
      const saudaWithPending = await calculatePendingQuantities(saudaRes.data, type);
      console.log(`LoadingForm: Found ${saudaWithPending.length} ${type} transactions with pending quantities:`, saudaWithPending.map(s => `${s.sauda_no} (${s.pending_quantity} packs)`));
      setSaudaList(saudaWithPending);
      setParties(partiesRes.data);
      setItems(itemsRes.data);
      setExPlants(exPlantsRes.data);
      setTransports(transportsRes.data);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
      Alert.alert('Error', 'Failed to load form data');
    }
  };

  const calculatePendingQuantities = async (saudaList: any[], transactionType: string) => {
    try {
      // Since we're using getPending API, all transactions should already have pending quantities
      const saudaWithPending = saudaList.map((sauda) => {
        // Use pending_quantity_packs from backend if available, otherwise fallback to calculation
        const pendingQuantity = sauda.pending_quantity_packs !== undefined 
          ? Math.max(0, sauda.pending_quantity_packs)
          : Math.max(0, (sauda.quantity_packs || sauda.quantity || 0));
        
        console.log(`Sauda ${sauda.sauda_no}: Pending quantity: ${pendingQuantity} packs`);
        
        return {
          ...sauda,
          pending_quantity: pendingQuantity
        };
      });
      
      // Filter out Sauda transactions with no pending quantity (shouldn't happen with getPending API)
      return saudaWithPending.filter(sauda => sauda.pending_quantity > 0);
    } catch (error) {
      console.error('Error calculating pending quantities:', error);
      return saudaList;
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
      setFormData(prev => ({ ...prev, loadingDate: isoDate }));
    }
  };

  // Conversion helpers
  const KG_PER_PACK = 1000;
  const kgToPacks = (kg: number) => kg / KG_PER_PACK;
  const packsToKg = (packs: number) => packs * KG_PER_PACK;

  const handleAddTransport = async (data: any) => {
    try {
      const transportData = { transport_name: data.name };
      const response = await transportsAPI.create(transportData);
      setTransports(prev => [...prev, response.data]);
      Alert.alert('Success', 'Transport company added successfully');
    } catch (error: any) {
      console.error('Error adding transport:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to add transport company');
    }
  };

  // Fix validation: compare packs, not kg
  const validateForm = () => {
    if (!formData.saudaId) {
      Alert.alert('Error', 'Please select an existing Sauda transaction');
      return false;
    }
    if (!formData.partyId) {
      Alert.alert('Error', 'Please select a party');
      return false;
    }
    if (!formData.itemId) {
      Alert.alert('Error', 'Please select an item');
      return false;
    }
    if (!formData.exPlantId) {
      Alert.alert('Error', 'Please select an ex plant');
      return false;
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid weight in kg');
      return false;
    }

    // Check if loading quantity exceeds pending quantity from original Sauda
    const selectedSauda = saudaList.find(s => s.id.toString() === formData.saudaId);
    if (selectedSauda) {
      const loadingKg = parseFloat(formData.quantity);
      const loadingPacks = kgToPacks(loadingKg);
      if (loadingPacks > selectedSauda.pending_quantity) {
        Alert.alert('Error', `Loading quantity (${loadingKg} kg = ${loadingPacks} packs) cannot exceed pending quantity (${selectedSauda.pending_quantity} packs = ${packsToKg(selectedSauda.pending_quantity)} kg) from original Sauda`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Prepare payload for backend
      const loadingData = {
        sauda_id: parseInt(formData.saudaId),
        loading_date: formData.loadingDate ? parseDate(formData.loadingDate) : new Date().toISOString().split('T')[0],
        vajan_kg: parseFloat(formData.quantity),
        note: formData.remarks,
        remarks: formData.remarks,
        transport_id: formData.transportId ? parseInt(formData.transportId) : null,
        tanker_number: formData.tankerNumber || null,
      };

      if (initialData?.id) {
        await loadingAPI.update(initialData.id, loadingData);
        Alert.alert('Success', `${type === 'purchase' ? 'Purchase' : 'Sell'} loading updated successfully`);
      } else {
        await loadingAPI.create(loadingData);
        Alert.alert('Success', `${type === 'purchase' ? 'Purchase' : 'Sell'} loading added successfully`);
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save loading entry');
    } finally {
      setLoading(false);
    }
  };

  // Add filtered dropdown logic for dependent dropdowns
  const filteredExPlants = exPlants.filter(exPlant => {
    if (!formData.itemId) return true;
    if (Array.isArray(exPlant.item_ids)) {
      return exPlant.item_ids.includes(parseInt(formData.itemId));
    }
    // If item_ids is missing, include all
    return true;
  });

  if (saudaList.length === 0) {
    console.warn('No sauda records found. Add purchase transactions to see options in the Sauda dropdown.');
  }

  // Fix: Show all parties if item_ids or ex_plant_ids are missing
  const filteredParties = parties.filter(party => {
    if (!formData.itemId || !formData.exPlantId) return true;
    if (Array.isArray(party.item_ids) && Array.isArray(party.ex_plant_ids)) {
      return party.item_ids.includes(parseInt(formData.itemId)) && party.ex_plant_ids.includes(parseInt(formData.exPlantId));
    }
    // If relationship fields are missing, include all
    return true;
  });

  if (filteredParties.length === 0) {
    console.warn('No parties found for the selected item and ex plant. Check your data or add parties.');
  }

  // Fix: Only show sauda matching selected item, ex plant, and party
  const filteredSaudaList = saudaList.filter(sauda =>
    (!formData.itemId || sauda.item_id === parseInt(formData.itemId)) &&
    (!formData.exPlantId || sauda.ex_plant_id === parseInt(formData.exPlantId)) &&
    (!formData.partyId || sauda.party_id === parseInt(formData.partyId))
  );

  console.log('Dropdown debug:', {
    items,
    filteredExPlants,
    filteredParties,
    filteredSaudaList,
  });
  console.log('Raw exPlants:', exPlants);
  console.log('Raw saudaList:', saudaList);

  // Reset lower selections when upper dropdown changes
  const updateFormData = (field: string, value: string) => {
    setFormData(prev => {
      let updated = { ...prev, [field]: value };
      if (field === 'itemId') {
        updated = { ...updated, exPlantId: '', partyId: '', saudaId: '' };
      } else if (field === 'exPlantId') {
        updated = { ...updated, partyId: '', saudaId: '' };
      } else if (field === 'partyId') {
        updated = { ...updated, saudaId: '' };
      }
      return updated;
    });
  };

  // Fix: Sauda dropdown display
  const formatSaudaItems = () => {
    return filteredSaudaList.map(sauda => {
      const pendingKg = packsToKg(sauda.pending_quantity);
      return {
        id: sauda.id,
        name: `${sauda.sauda_no} - ${sauda.party_name} (${sauda.item_name}) - Pending: ${sauda.pending_quantity} packs (${pendingKg} kg)`
      };
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {initialData ? 'Edit' : 'Add'} {type === 'purchase' ? 'Purchase' : 'Sell'} Loading
        </Text>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.form}>
        {/* Item */}
        <SearchableDropdown
          label="Item"
          value={formData.itemId}
          placeholder="Select item"
          items={items}
          onSelect={(id) => updateFormData('itemId', id)}
          required
        />

        {/* Ex Plant */}
        <SearchableDropdown
          label="Ex Plant"
          value={formData.exPlantId}
          placeholder="Select ex plant"
          items={filteredExPlants}
          onSelect={(id) => updateFormData('exPlantId', id)}
          required
        />

        {/* Party */}
        <SearchableDropdown
          label={type === 'purchase' ? 'Seller Party' : 'Buyer Party'}
          value={formData.partyId}
          placeholder={`Select ${type === 'purchase' ? 'seller' : 'buyer'} party`}
          items={filteredParties}
          onSelect={(id) => updateFormData('partyId', id)}
          required
        />

        {/* Sauda Selection */}
        <SearchableDropdown
          label="Select Sauda Transaction"
          value={formData.saudaId}
          placeholder="Select existing Sauda with pending loading"
          items={formatSaudaItems()}
          onSelect={(id) => updateFormData('saudaId', id)}
          required
        />

        {/* Quantity */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Weight (in KG)</Text>
          <TextInput
            style={styles.input}
            value={formData.quantity}
            onChangeText={(text) => updateFormData('quantity', text)}
            placeholder="Enter weight in kg"
            keyboardType="numeric"
          />
          <Text style={styles.helperText}>
            1 pack = 1000 kg • App will convert and store as packs
          </Text>
        </View>

        {/* Loading Date */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Loading Date</Text>
          <TouchableOpacity
            style={[styles.input, { flexDirection: 'row', alignItems: 'center', paddingRight: 12 }]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={{ flex: 1, color: '#1F2937', fontSize: 16 }}>{formatDate(formData.loadingDate)}</Text>
            <Ionicons name="calendar" size={20} color="#6B7280" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={formData.loadingDate ? new Date(formData.loadingDate) : new Date()}
              mode="date"
              display="default"
              onChange={handleDateChangePicker}
            />
          )}
        </View>

        {/* Remarks */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Note (Remarks)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.remarks}
            onChangeText={(text) => updateFormData('remarks', text)}
            placeholder="Enter remarks (optional)"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Transport Company */}
        <SearchableDropdown
          label="Transport Company"
          value={formData.transportId}
          placeholder="Select transport company"
          items={transports}
          onSelect={(id) => updateFormData('transportId', id)}
          onAddNew={() => setShowTransportModal(true)}
        />

        {/* Tanker Number */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tanker Number</Text>
          <TextInput
            style={styles.input}
            value={formData.tankerNumber}
            onChangeText={(text) => updateFormData('tankerNumber', text)}
            placeholder="Enter tanker number (optional)"
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
                name="car" 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.submitButtonText}>
                {initialData ? 'Update' : 'Add'} {type === 'purchase' ? 'Purchase' : 'Sell'} Loading
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Add Transport Modal */}
      <AddEntityModal
        visible={showTransportModal}
        title="Add New Transport Company"
        entityName="Transport Company"
        entityType="transport"
        onClose={() => setShowTransportModal(false)}
        onAdd={handleAddTransport}
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
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
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
}); 