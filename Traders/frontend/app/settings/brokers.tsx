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
import { brokersAPI } from '../../services/api';
import Card from '../../components/Card';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Broker {
  id: number;
  broker_name: string;
}

export default function BrokersSettingsScreen() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);

  const fetchBrokers = async () => {
    try {
      const response = await brokersAPI.getAll();
      setBrokers(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load brokers');
      console.error('Brokers error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchBrokers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBrokers();
  };

  const handleEdit = (broker: Broker) => {
    setEditingBroker(broker);
  };

  const handleDelete = (broker: Broker) => {
    Alert.alert(
      'Delete Broker',
      `Are you sure you want to delete "${broker.broker_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await brokersAPI.delete(broker.id);
              fetchBrokers();
              Alert.alert('Success', 'Broker deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete broker');
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingBroker) return;

    try {
      await brokersAPI.update(editingBroker.id, editingBroker);
      setEditingBroker(null);
      fetchBrokers();
      Alert.alert('Success', 'Broker updated successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update broker');
    }
  };

  const filteredBrokers = brokers.filter(broker =>
    broker.broker_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading brokers...</Text>
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
        <Text style={styles.title}>Brokers</Text>
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
                placeholder="Search brokers..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </Card>
        </View>

        {/* Brokers List */}
        <View style={styles.brokersSection}>
          {filteredBrokers.map((broker) => (
            <Card key={broker.id} style={styles.brokerCard}>
              {editingBroker?.id === broker.id ? (
                // Edit Mode
                <View style={styles.editForm}>
                  <TextInput
                    style={styles.editInput}
                    value={editingBroker.broker_name}
                    onChangeText={(text) => setEditingBroker({...editingBroker, broker_name: text})}
                    placeholder="Broker Name"
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
                      onPress={() => setEditingBroker(null)}
                    >
                      <Ionicons name="close" size={16} color="#6B7280" />
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // View Mode
                <View style={styles.brokerInfo}>
                  <View style={styles.brokerHeader}>
                    <Text style={styles.brokerName}>{broker.broker_name}</Text>
                    <View style={styles.brokerActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEdit(broker)}
                      >
                        <Ionicons name="pencil" size={16} color="#0F4C75" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDelete(broker)}
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

        {filteredBrokers.length === 0 && (
          <View style={styles.emptySection}>
            <Card>
              <View style={styles.emptyContent}>
                <Ionicons name="person-outline" size={48} color="#6B7280" />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No brokers found' : 'No brokers available'}
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
  brokersSection: {
    padding: 16,
    paddingBottom: 32,
  },
  brokerCard: {
    marginBottom: 12,
  },
  brokerInfo: {
    padding: 16,
  },
  brokerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brokerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  brokerActions: {
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