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
import { exPlantsAPI } from '../../services/api';
import Card from '../../components/Card';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ExPlant {
  id: number;
  plant_name: string;
}

export default function ExPlantsSettingsScreen() {
  const [exPlants, setExPlants] = useState<ExPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingExPlant, setEditingExPlant] = useState<ExPlant | null>(null);

  const fetchExPlants = async () => {
    try {
      const response = await exPlantsAPI.getAll();
      setExPlants(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load ex-plants');
      console.error('Ex-plants error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchExPlants();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchExPlants();
  };

  const handleEdit = (exPlant: ExPlant) => {
    setEditingExPlant(exPlant);
  };

  const handleDelete = (exPlant: ExPlant) => {
    Alert.alert(
      'Delete Ex-Plant',
      `Are you sure you want to delete "${exPlant.plant_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await exPlantsAPI.delete(exPlant.id);
              fetchExPlants();
              Alert.alert('Success', 'Ex-plant deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete ex-plant');
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingExPlant) return;

    try {
      await exPlantsAPI.update(editingExPlant.id, editingExPlant);
      setEditingExPlant(null);
      fetchExPlants();
      Alert.alert('Success', 'Ex-plant updated successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update ex-plant');
    }
  };

  const filteredExPlants = exPlants.filter(exPlant =>
    exPlant.plant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading ex-plants...</Text>
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
        <Text style={styles.title}>Ex-Plants</Text>
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
                placeholder="Search ex-plants..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </Card>
        </View>

        {/* Ex-Plants List */}
        <View style={styles.exPlantsSection}>
          {filteredExPlants.map((exPlant) => (
            <Card key={exPlant.id} style={styles.exPlantCard}>
              {editingExPlant?.id === exPlant.id ? (
                // Edit Mode
                <View style={styles.editForm}>
                  <TextInput
                    style={styles.editInput}
                    value={editingExPlant.plant_name}
                    onChangeText={(text) => setEditingExPlant({...editingExPlant, plant_name: text})}
                    placeholder="Plant Name"
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
                      onPress={() => setEditingExPlant(null)}
                    >
                      <Ionicons name="close" size={16} color="#6B7280" />
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // View Mode
                <View style={styles.exPlantInfo}>
                  <View style={styles.exPlantHeader}>
                    <Text style={styles.exPlantName}>{exPlant.plant_name}</Text>
                    <View style={styles.exPlantActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEdit(exPlant)}
                      >
                        <Ionicons name="pencil" size={16} color="#0F4C75" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDelete(exPlant)}
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

        {filteredExPlants.length === 0 && (
          <View style={styles.emptySection}>
            <Card>
              <View style={styles.emptyContent}>
                <Ionicons name="business-outline" size={48} color="#6B7280" />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No ex-plants found' : 'No ex-plants available'}
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
  exPlantsSection: {
    padding: 16,
    paddingBottom: 32,
  },
  exPlantCard: {
    marginBottom: 12,
  },
  exPlantInfo: {
    padding: 16,
  },
  exPlantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exPlantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  exPlantActions: {
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