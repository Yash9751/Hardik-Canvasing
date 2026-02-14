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
import { partiesAPI } from '../../services/api';
import Card from '../../components/Card';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Party {
  id: number;
  party_name: string;
  city: string;
  gst_no: string;
  contact_person: string;
  mobile_number: string;
  email: string;
  party_type: string;
}

export default function PartiesSettingsScreen() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  const fetchParties = async () => {
    try {
      const response = await partiesAPI.getAll();
      setParties(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load parties');
      console.error('Parties error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchParties();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchParties();
  };

  const handleEdit = (party: Party) => {
    setEditingParty(party);
  };

  const handleDelete = (party: Party) => {
    Alert.alert(
      'Delete Party',
      `Are you sure you want to delete "${party.party_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await partiesAPI.delete(party.id);
              fetchParties();
              Alert.alert('Success', 'Party deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete party');
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingParty) return;

    try {
      await partiesAPI.update(editingParty.id, editingParty);
      setEditingParty(null);
      fetchParties();
      Alert.alert('Success', 'Party updated successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update party');
    }
  };

  const filteredParties = parties.filter(party =>
    party.party_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    party.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading parties...</Text>
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
        <Text style={styles.title}>Parties</Text>
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
                placeholder="Search parties..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </Card>
        </View>

        {/* Parties List */}
        <View style={styles.partiesSection}>
          {filteredParties.map((party) => (
            <Card key={party.id} style={styles.partyCard}>
              {editingParty?.id === party.id ? (
                // Edit Mode
                <View style={styles.editForm}>
                  <TextInput
                    style={styles.editInput}
                    value={editingParty.party_name}
                    onChangeText={(text) => setEditingParty({...editingParty, party_name: text})}
                    placeholder="Party Name"
                  />
                  <TextInput
                    style={styles.editInput}
                    value={editingParty.city}
                    onChangeText={(text) => setEditingParty({...editingParty, city: text})}
                    placeholder="City"
                  />
                  <TextInput
                    style={styles.editInput}
                    value={editingParty.mobile_number}
                    onChangeText={(text) => setEditingParty({...editingParty, mobile_number: text})}
                    placeholder="Mobile Number"
                    keyboardType="phone-pad"
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
                      onPress={() => setEditingParty(null)}
                    >
                      <Ionicons name="close" size={16} color="#6B7280" />
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // View Mode
                <View style={styles.partyInfo}>
                  <View style={styles.partyHeader}>
                    <Text style={styles.partyName}>{party.party_name}</Text>
                    <View style={styles.partyActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEdit(party)}
                      >
                        <Ionicons name="pencil" size={16} color="#0F4C75" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDelete(party)}
                      >
                        <Ionicons name="trash" size={16} color="#E74C3C" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.partyDetails}>
                    {party.city} • {party.party_type}
                  </Text>
                  {party.mobile_number && (
                    <Text style={styles.partyDetails}>
                      📞 {party.mobile_number}
                    </Text>
                  )}
                </View>
              )}
            </Card>
          ))}
        </View>

        {filteredParties.length === 0 && (
          <View style={styles.emptySection}>
            <Card>
              <View style={styles.emptyContent}>
                <Ionicons name="people-outline" size={48} color="#6B7280" />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No parties found' : 'No parties available'}
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
  partiesSection: {
    padding: 16,
    paddingBottom: 32,
  },
  partyCard: {
    marginBottom: 12,
  },
  partyInfo: {
    padding: 16,
  },
  partyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  partyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  partyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  partyDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
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