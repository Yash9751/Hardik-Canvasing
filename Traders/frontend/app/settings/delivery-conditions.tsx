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
import { deliveryConditionsAPI } from '../../services/api';
import Card from '../../components/Card';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DeliveryCondition {
  id: number;
  condition_name: string;
}

export default function DeliveryConditionsSettingsScreen() {
  const [deliveryConditions, setDeliveryConditions] = useState<DeliveryCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCondition, setEditingCondition] = useState<DeliveryCondition | null>(null);

  const fetchDeliveryConditions = async () => {
    try {
      const response = await deliveryConditionsAPI.getAll();
      setDeliveryConditions(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load delivery conditions');
      console.error('Delivery conditions error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchDeliveryConditions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveryConditions();
  };

  const handleEdit = (condition: DeliveryCondition) => {
    setEditingCondition(condition);
  };

  const handleDelete = (condition: DeliveryCondition) => {
    Alert.alert(
      'Delete Delivery Condition',
      `Are you sure you want to delete "${condition.condition_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deliveryConditionsAPI.delete(condition.id);
              fetchDeliveryConditions();
              Alert.alert('Success', 'Delivery condition deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete delivery condition');
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingCondition) return;

    try {
      await deliveryConditionsAPI.update(editingCondition.id, editingCondition);
      setEditingCondition(null);
      fetchDeliveryConditions();
      Alert.alert('Success', 'Delivery condition updated successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update delivery condition');
    }
  };

  const filteredConditions = deliveryConditions.filter(condition =>
    condition.condition_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading delivery conditions...</Text>
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
        <Text style={styles.title}>Delivery Conditions</Text>
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
                placeholder="Search delivery conditions..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </Card>
        </View>

        {/* Delivery Conditions List */}
        <View style={styles.conditionsSection}>
          {filteredConditions.map((condition) => (
            <Card key={condition.id} style={styles.conditionCard}>
              {editingCondition?.id === condition.id ? (
                // Edit Mode
                <View style={styles.editForm}>
                  <TextInput
                    style={styles.editInput}
                    value={editingCondition.condition_name}
                    onChangeText={(text) => setEditingCondition({...editingCondition, condition_name: text})}
                    placeholder="Condition Name"
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
                      onPress={() => setEditingCondition(null)}
                    >
                      <Ionicons name="close" size={16} color="#6B7280" />
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // View Mode
                <View style={styles.conditionInfo}>
                  <View style={styles.conditionHeader}>
                    <Text style={styles.conditionName}>{condition.condition_name}</Text>
                    <View style={styles.conditionActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEdit(condition)}
                      >
                        <Ionicons name="pencil" size={16} color="#0F4C75" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDelete(condition)}
                      >
                        <Ionicons name="trash" size={16} color="#E74C3C" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </Card>
          ))}
        </View>

        {filteredConditions.length === 0 && (
          <View style={styles.emptySection}>
            <Card>
              <View style={styles.emptyContent}>
                <Ionicons name="car-outline" size={48} color="#6B7280" />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No delivery conditions found' : 'No delivery conditions available'}
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
  conditionsSection: {
    padding: 16,
    paddingBottom: 32,
  },
  conditionCard: {
    marginBottom: 12,
  },
  conditionInfo: {
    padding: 16,
  },
  conditionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conditionName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  conditionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
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