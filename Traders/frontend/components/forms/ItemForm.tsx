import React, { useState } from 'react';
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
import { itemsAPI } from '../../services/api';

interface ItemFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
}

export default function ItemForm({ onSuccess, onCancel, initialData }: ItemFormProps) {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    itemName: '',
    nickName: '',
    hsnCode: '',
  });

  // Load initial data
  React.useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const validateForm = () => {
    if (!formData.itemName.trim()) {
      Alert.alert('Error', 'Item name is required');
      return false;
    }
    if (!formData.nickName.trim()) {
      Alert.alert('Error', 'Nick name is required');
      return false;
    }
    if (!formData.hsnCode.trim()) {
      Alert.alert('Error', 'HSN code is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const itemData = {
        name: formData.itemName.trim(),
        nick_name: formData.nickName.trim(),
        hsn_code: formData.hsnCode.trim(),
      };

      if (initialData?.id) {
        await itemsAPI.update(initialData.id, itemData);
        Alert.alert('Success', 'Item updated successfully');
      } else {
        await itemsAPI.create(itemData);
        Alert.alert('Success', 'Item added successfully');
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {initialData ? 'Edit' : 'Add'} Item
        </Text>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.form}>
        {/* Item Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Item Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.itemName}
            onChangeText={(text) => updateFormData('itemName', text)}
            placeholder="Enter item name"
            autoFocus
          />
        </View>

        {/* Nick Name */}
        <View style={[styles.formGroup, { backgroundColor: '#F0F8FF', padding: 10, borderRadius: 8 }]}>
          <Text style={styles.label}>
            Nick Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.nickName}
            onChangeText={(text) => updateFormData('nickName', text)}
            placeholder="Enter nick name"
            autoCapitalize="words"
          />
        </View>

        {/* HSN Code */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            HSN Code <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.hsnCode}
            onChangeText={(text) => updateFormData('hsnCode', text)}
            placeholder="Enter HSN code"
            autoCapitalize="characters"
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
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {initialData ? 'Update' : 'Add'} Item
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  required: {
    color: '#E74C3C',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
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