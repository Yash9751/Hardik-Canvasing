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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, Stack } from 'expo-router';
import { itemsAPI } from '../../services/api';
import Card from '../../components/Card';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Item {
  id: number;
  item_name: string;
  nick_name: string;
  hsn_code: string;
}

export default function ItemsSettingsScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const fetchItems = async () => {
    try {
      const response = await itemsAPI.getAll();
      setItems(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load items');
      console.error('Items error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchItems();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
  };

  const handleDelete = (item: Item) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.item_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await itemsAPI.delete(item.id);
              fetchItems();
              Alert.alert('Success', 'Item deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      await itemsAPI.update(editingItem.id, editingItem);
      setEditingItem(null);
      fetchItems();
      Alert.alert('Success', 'Item updated successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update item');
    }
  };

  const filteredItems = items.filter(item =>
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.nick_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.hsn_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading items...</Text>
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
        <Text style={styles.title}>Items</Text>
      </View>

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
                placeholder="Search items..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </Card>
        </View>

        {/* Items List */}
        <View style={styles.itemsSection}>
          {filteredItems.map((item) => (
            <Card key={item.id} style={styles.itemCard}>
              {editingItem?.id === item.id ? (
                // Edit Mode
                <View style={styles.editForm}>
                  <TextInput
                    style={styles.editInput}
                    value={editingItem.item_name}
                    onChangeText={(text) => setEditingItem({...editingItem, item_name: text})}
                    placeholder="Item Name"
                  />
                  <TextInput
                    style={styles.editInput}
                    value={editingItem.nick_name}
                    onChangeText={(text) => setEditingItem({...editingItem, nick_name: text})}
                    placeholder="Nick Name"
                  />
                  <TextInput
                    style={styles.editInput}
                    value={editingItem.hsn_code}
                    onChangeText={(text) => setEditingItem({...editingItem, hsn_code: text})}
                    placeholder="HSN Code"
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={[styles.editButton, styles.saveButton]}
                      onPress={handleSaveEdit}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editButton, styles.cancelButton]}
                      onPress={() => setEditingItem(null)}
                    >
                      <Ionicons name="close" size={16} color="#6B7280" />
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // View Mode
                <View style={styles.itemInfo}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.item_name}</Text>
                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEdit(item)}
                      >
                        <Ionicons name="pencil" size={16} color="#0F4C75" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDelete(item)}
                      >
                        <Ionicons name="trash" size={16} color="#E74C3C" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.itemDetails}>
                    Nick Name: {item.nick_name}
                  </Text>
                  {item.hsn_code && (
                    <Text style={styles.itemDetails}>
                      HSN: {item.hsn_code}
                    </Text>
                  )}
                </View>
              )}
            </Card>
          ))}
        </View>

        {filteredItems.length === 0 && (
          <View style={styles.emptySection}>
            <Card>
              <View style={styles.emptyContent}>
                <Ionicons name="cube-outline" size={48} color="#6B7280" />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No items found' : 'No items available'}
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
  itemsSection: {
    padding: 16,
    paddingBottom: 32,
  },
  itemCard: {
    marginBottom: 12,
  },
  itemInfo: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  itemDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  editForm: {
    padding: 16,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#0F4C75',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    marginLeft: 4,
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
}); 