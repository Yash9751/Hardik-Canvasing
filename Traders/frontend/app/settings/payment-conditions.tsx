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
import { paymentConditionsAPI } from '../../services/api';
import Card from '../../components/Card';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PaymentCondition {
  id: number;
  condition_name: string;
}

export default function PaymentConditionsSettingsScreen() {
  const [paymentConditions, setPaymentConditions] = useState<PaymentCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCondition, setEditingCondition] = useState<PaymentCondition | null>(null);

  const fetchPaymentConditions = async () => {
    try {
      const response = await paymentConditionsAPI.getAll();
      setPaymentConditions(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load payment conditions');
      console.error('Payment conditions error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchPaymentConditions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPaymentConditions();
  };

  const handleEdit = (condition: PaymentCondition) => {
    setEditingCondition(condition);
  };

  const handleDelete = (condition: PaymentCondition) => {
    Alert.alert(
      'Delete Payment Condition',
      `Are you sure you want to delete "${condition.condition_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentConditionsAPI.delete(condition.id);
              fetchPaymentConditions();
              Alert.alert('Success', 'Payment condition deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete payment condition');
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingCondition) return;

    if (!editingCondition.condition_name.trim()) {
      Alert.alert('Error', 'Payment condition name is required');
      return;
    }

    try {
      await paymentConditionsAPI.update(editingCondition.id, editingCondition);
      setEditingCondition(null);
      fetchPaymentConditions();
      Alert.alert('Success', 'Payment condition updated successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update payment condition');
    }
  };

  const filteredConditions = paymentConditions.filter(condition =>
    condition.condition_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading payment conditions...</Text>
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
        <Text style={styles.title}>Payment Conditions</Text>
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
                placeholder="Search payment conditions..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </Card>
        </View>

        {/* Payment Conditions List */}
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
                    placeholder="Payment Condition Name"
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

          {filteredConditions.length === 0 && !loading && (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No payment conditions found matching your search.' : 'No payment conditions found.'}
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
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
  searchSection: {
    padding: 20,
    paddingBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  conditionsSection: {
    padding: 20,
    paddingTop: 10,
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
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  saveButton: {
    backgroundColor: '#2ECC71',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
}); 