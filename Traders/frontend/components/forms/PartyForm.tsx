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
import { partiesAPI } from '../../services/api';

interface PartyFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
}

export default function PartyForm({ onSuccess, onCancel, initialData }: PartyFormProps) {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    partyName: '',
    partyType: 'customer', // customer, supplier, both
    address: '',
    phone: '',
    gstNumber: '',
  });

  // Load initial data
  React.useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Refresh data when form comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Could load existing parties here if needed
    }, [])
  );

  const validateForm = () => {
    if (!formData.partyName.trim()) {
      Alert.alert('Error', 'Party name is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const partyData = {
        name: formData.partyName.trim(),
        party_type: formData.partyType,
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        gst_number: formData.gstNumber.trim(),
      };

      if (initialData?.id) {
        await partiesAPI.update(initialData.id, partyData);
        Alert.alert('Success', 'Party updated successfully');
      } else {
        await partiesAPI.create(partyData);
        Alert.alert('Success', 'Party added successfully');
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save party');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>
          {initialData ? 'Edit Party' : 'Add New Party'}
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Party Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.partyName}
            onChangeText={(text) => updateFormData('partyName', text)}
            placeholder="Enter party name"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Party Type</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioButton,
                formData.partyType === 'customer' && styles.radioButtonActive
              ]}
              onPress={() => updateFormData('partyType', 'customer')}
            >
              <Text style={[
                styles.radioText,
                formData.partyType === 'customer' && styles.radioTextActive
              ]}>
                Customer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.radioButton,
                formData.partyType === 'supplier' && styles.radioButtonActive
              ]}
              onPress={() => updateFormData('partyType', 'supplier')}
            >
              <Text style={[
                styles.radioText,
                formData.partyType === 'supplier' && styles.radioTextActive
              ]}>
                Supplier
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.radioButton,
                formData.partyType === 'both' && styles.radioButtonActive
              ]}
              onPress={() => updateFormData('partyType', 'both')}
            >
              <Text style={[
                styles.radioText,
                formData.partyType === 'both' && styles.radioTextActive
              ]}>
                Both
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address}
            onChangeText={(text) => updateFormData('address', text)}
            placeholder="Enter address"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => updateFormData('phone', text)}
            placeholder="Enter phone number"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>GST Number</Text>
          <TextInput
            style={styles.input}
            value={formData.gstNumber}
            onChangeText={(text) => updateFormData('gstNumber', text)}
            placeholder="Enter GST number"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {initialData ? 'Update' : 'Add'} Party
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
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
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioButtonActive: {
    borderColor: '#0F4C75',
    backgroundColor: '#0F4C75',
  },
  radioText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  radioTextActive: {
    color: '#FFFFFF',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 2,
    padding: 16,
    backgroundColor: '#0F4C75',
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 