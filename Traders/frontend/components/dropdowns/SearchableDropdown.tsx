import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchableDropdownProps {
  label: string;
  value: string;
  placeholder: string;
  items: Array<{ id: number; name?: string; party_name?: string; item_name?: string; plant_name?: string; broker_name?: string; condition_name?: string; transport_name?: string; [key: string]: any }>;
  onSelect: (id: string) => void;
  onAddNew?: () => void;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function SearchableDropdown({
  label,
  value,
  placeholder,
  items,
  onSelect,
  onAddNew,
  searchPlaceholder = 'Search...',
  required = false,
  disabled = false,
}: SearchableDropdownProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Helper function to get the display name from an item
  const getItemName = (item: any): string => {
    return item.name || item.party_name || item.item_name || item.plant_name || item.broker_name || item.condition_name || item.transport_name || 'Unknown';
  };

  const filteredItems = items.filter(item => {
    const itemName = getItemName(item);
    return itemName.toLowerCase().includes(searchText.toLowerCase());
  });

  const selectedItem = items.find(item => item.id.toString() === value);

  const handleSelect = (id: string) => {
    onSelect(id);
    setIsVisible(false);
    setSearchText('');
  };

  const handleAddNew = () => {
    if (onAddNew) {
      onAddNew();
    }
    setIsVisible(false);
    setSearchText('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      
      <TouchableOpacity
        style={[styles.dropdownButton, disabled && styles.disabled]}
        onPress={() => !disabled && setIsVisible(true)}
        disabled={disabled}
      >
        <Text style={selectedItem ? styles.dropdownText : styles.placeholderText}>
          {selectedItem ? getItemName(selectedItem) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#6B7280" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setIsVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              value={searchText}
              onChangeText={setSearchText}
            />

            <ScrollView style={styles.dropdownList}>
              {filteredItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.dropdownItem,
                    selectedItem?.id === item.id && styles.selectedItem
                  ]}
                  onPress={() => handleSelect(item.id.toString())}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    selectedItem?.id === item.id && styles.selectedItemText
                  ]}>
                    {getItemName(item)}
                  </Text>
                  {selectedItem?.id === item.id && (
                    <Ionicons name="checkmark" size={20} color="#2ECC71" />
                  )}
                </TouchableOpacity>
              ))}
              
              {filteredItems.length === 0 && searchText && (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>No results found</Text>
                </View>
              )}
            </ScrollView>

            {onAddNew && (
              <TouchableOpacity
                style={styles.addNewButton}
                onPress={handleAddNew}
              >
                <Ionicons name="add-circle" size={20} color="#2ECC71" />
                <Text style={styles.addNewText}>Add New</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  dropdownButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.6,
  },
  dropdownText: {
    fontSize: 16,
    color: '#1F2937',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF',
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
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedItem: {
    backgroundColor: '#F0F9FF',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1F2937',
  },
  selectedItemText: {
    color: '#0F4C75',
    fontWeight: '600',
  },
  noResults: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#6B7280',
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    marginTop: 16,
  },
  addNewText: {
    fontSize: 16,
    color: '#2ECC71',
    fontWeight: '600',
    marginLeft: 8,
  },
}); 