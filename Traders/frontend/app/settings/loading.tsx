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
import { loadingAPI, saudaAPI, partiesAPI, itemsAPI, exPlantsAPI, transportsAPI } from '../../services/api';
import Card from '../../components/Card';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LoadingRecord {
  id: number;
  sauda_id: number;
  loading_date: string;
  vajan_kg: number;
  note: string;
  transport_id?: number;
  tanker_number?: string;
  sauda_no?: string;
  party_name?: string;
  item_name?: string;
  transport_name?: string;
}

export default function LoadingManagementScreen() {
  const [loadingRecords, setLoadingRecords] = useState<LoadingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRecord, setEditingRecord] = useState<LoadingRecord | null>(null);
  const [transports, setTransports] = useState<any[]>([]);

  const fetchLoadingRecords = async () => {
    try {
      const [loadingResponse, transportsResponse] = await Promise.all([
        loadingAPI.getAll(),
        transportsAPI.getAll()
      ]);
      
      // Get detailed loading records with related data
      const detailedRecords = await Promise.all(
        loadingResponse.data.map(async (record: any) => {
          try {
            const saudaResponse = await saudaAPI.getById(record.sauda_id);
            const sauda = saudaResponse.data;
            
            // Get party and item details
            const [partyResponse, itemResponse] = await Promise.all([
              partiesAPI.getById(sauda.party_id),
              itemsAPI.getById(sauda.item_id)
            ]);
            
            return {
              ...record,
              sauda_no: sauda.sauda_no,
              party_name: partyResponse.data.party_name,
              item_name: itemResponse.data.item_name,
              transport_name: record.transport_id ? 
                transportsResponse.data.find((t: any) => t.id === record.transport_id)?.transport_name : null
            };
          } catch (error) {
            console.error('Error fetching details for loading record:', error);
            return record;
          }
        })
      );
      
      setLoadingRecords(detailedRecords);
      setTransports(transportsResponse.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load loading records');
      console.error('Loading records error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchLoadingRecords();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLoadingRecords();
  };

  const handleEdit = (record: LoadingRecord) => {
    setEditingRecord(record);
  };

  const handleDelete = (record: LoadingRecord) => {
    Alert.alert(
      'Delete Loading Record',
      `Are you sure you want to delete this loading record for Sauda ${record.sauda_no}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await loadingAPI.delete(record.id);
              fetchLoadingRecords();
              Alert.alert('Success', 'Loading record deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete loading record');
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    if (!editingRecord.loading_date || !editingRecord.vajan_kg) {
      Alert.alert('Error', 'Loading date and weight are required');
      return;
    }

    try {
      const updateData = {
        sauda_id: editingRecord.sauda_id,
        loading_date: editingRecord.loading_date,
        vajan_kg: editingRecord.vajan_kg,
        note: editingRecord.note || '',
        transport_id: editingRecord.transport_id || null,
        tanker_number: editingRecord.tanker_number || null,
      };
      
      await loadingAPI.update(editingRecord.id, updateData);
      setEditingRecord(null);
      fetchLoadingRecords();
      Alert.alert('Success', 'Loading record updated successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update loading record');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const filteredRecords = loadingRecords.filter(record =>
    record.sauda_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.party_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.item_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading records...</Text>
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
        <Text style={styles.title}>Loading Management</Text>
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
                placeholder="Search by sauda number, party, or item..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </Card>
        </View>

        {/* Loading Records List */}
        <View style={styles.recordsSection}>
          {filteredRecords.map((record) => (
            <Card key={record.id} style={styles.recordCard}>
              {editingRecord?.id === record.id ? (
                // Edit Mode
                <View style={styles.editForm}>
                  <Text style={styles.editLabel}>Sauda Number</Text>
                  <Text style={styles.editValue}>{record.sauda_no}</Text>
                  
                  <Text style={styles.editLabel}>Loading Date</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editingRecord.loading_date}
                    onChangeText={(text) => setEditingRecord({...editingRecord, loading_date: text})}
                    placeholder="YYYY-MM-DD"
                  />
                  
                  <Text style={styles.editLabel}>Weight (KG)</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editingRecord.vajan_kg.toString()}
                    onChangeText={(text) => setEditingRecord({...editingRecord, vajan_kg: parseFloat(text) || 0})}
                    placeholder="Enter weight in KG"
                    keyboardType="numeric"
                  />
                  
                  <Text style={styles.editLabel}>Transport Company</Text>
                  <View style={styles.transportDropdown}>
                    {transports.map((transport) => (
                      <TouchableOpacity
                        key={transport.id}
                        style={[
                          styles.transportOption,
                          editingRecord.transport_id === transport.id && styles.selectedTransport
                        ]}
                        onPress={() => setEditingRecord({...editingRecord, transport_id: transport.id})}
                      >
                        <Text style={[
                          styles.transportText,
                          editingRecord.transport_id === transport.id && styles.selectedTransportText
                        ]}>
                          {transport.transport_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  <Text style={styles.editLabel}>Tanker Number</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editingRecord.tanker_number || ''}
                    onChangeText={(text) => setEditingRecord({...editingRecord, tanker_number: text})}
                    placeholder="Enter tanker number"
                  />
                  
                  <Text style={styles.editLabel}>Note</Text>
                  <TextInput
                    style={[styles.editInput, styles.textArea]}
                    value={editingRecord.note || ''}
                    onChangeText={(text) => setEditingRecord({...editingRecord, note: text})}
                    placeholder="Enter note"
                    multiline
                    numberOfLines={3}
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
                      onPress={() => setEditingRecord(null)}
                    >
                      <Ionicons name="close" size={16} color="#6B7280" />
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // View Mode
                <View style={styles.recordInfo}>
                  <View style={styles.recordHeader}>
                    <Text style={styles.saudaNumber}>Sauda: {record.sauda_no}</Text>
                    <View style={styles.recordActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEdit(record)}
                      >
                        <Ionicons name="pencil" size={16} color="#0F4C75" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDelete(record)}
                      >
                        <Ionicons name="trash" size={16} color="#E74C3C" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.recordDetails}>
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Party: </Text>
                      {record.party_name}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Item: </Text>
                      {record.item_name}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Date: </Text>
                      {formatDate(record.loading_date)}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Weight: </Text>
                      {record.vajan_kg} KG
                    </Text>
                    {record.transport_name && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Transport: </Text>
                        {record.transport_name}
                      </Text>
                    )}
                    {record.tanker_number && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Tanker: </Text>
                        {record.tanker_number}
                      </Text>
                    )}
                    {record.note && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Note: </Text>
                        {record.note}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </Card>
          ))}

          {filteredRecords.length === 0 && !loading && (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No loading records found matching your search.' : 'No loading records found.'}
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
  recordsSection: {
    padding: 20,
    paddingTop: 10,
  },
  recordCard: {
    marginBottom: 12,
  },
  recordInfo: {
    padding: 16,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  saudaNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  recordActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  recordDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },
  detailLabel: {
    fontWeight: '600',
    color: '#6B7280',
  },
  editForm: {
    padding: 16,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 12,
  },
  editValue: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  transportDropdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  transportOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedTransport: {
    backgroundColor: '#0F4C75',
    borderColor: '#0F4C75',
  },
  transportText: {
    fontSize: 14,
    color: '#374151',
  },
  selectedTransportText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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