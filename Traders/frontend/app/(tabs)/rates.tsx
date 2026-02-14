import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { ratesAPI } from '../../services/api';
import Card from '../../components/Card';
import Header from '../../components/Header';
import Button from '../../components/Button';

interface RateItem {
  id: number;
  item_name: string;
  current_rate: number;
  effective_date: string;
  hsn_code: string;
}

export default function RatesScreen() {
  const router = useRouter();
  const [rates, setRates] = useState<RateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RateItem | null>(null);
  const [newRate, setNewRate] = useState('');

  const fetchRates = async () => {
    try {
      const response = await ratesAPI.getAll();
      setRates(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load rates data');
      console.error('Rates error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchRates();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRates();
  };

  const handleRateUpdate = async () => {
    if (!selectedItem || !newRate) {
      Alert.alert('Error', 'Please enter a valid rate');
      return;
    }

    try {
      await ratesAPI.update(selectedItem.id, {
        rate_per_10kg: parseFloat(newRate),
        effective_date: new Date().toISOString().split('T')[0]
      });
      
      setModalVisible(false);
      setNewRate('');
      setSelectedItem(null);
      fetchRates();
      Alert.alert('Success', 'Rate updated successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update rate');
      console.error('Rate update error:', error);
    }
  };

  const openRateModal = (item: RateItem) => {
    setSelectedItem(item);
    setNewRate(item.current_rate.toString());
    setModalVisible(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading rates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Rates" 
        rightAction={{
          icon: 'share-social-outline',
          onPress: () => router.push('/broadcast-rates')
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Current Rates</Text>
          <View style={styles.ratesGrid}>
            {rates.map((item) => (
              <Card key={item.id} style={styles.rateCard}>
                <View style={styles.rateHeader}>
                  <View style={styles.rateIcon}>
                    <Ionicons name="pricetag" size={32} color="#0F4C75" />
                  </View>
                  <View style={styles.rateInfo}>
                    <Text style={styles.itemName}>{item.item_name}</Text>
                    <Text style={styles.hsnCode}>HSN: {item.hsn_code}</Text>
                  </View>
                </View>
                <View style={styles.rateDetails}>
                  <Text style={styles.rateValue}>
                    {formatCurrency(item.current_rate)} per 10kg
                  </Text>
                  <Text style={styles.effectiveDate}>
                    Effective: {formatDate(item.effective_date)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={() => openRateModal(item)}
                >
                  <Ionicons name="create" size={20} color="#0F4C75" />
                  <Text style={styles.updateButtonText}>Update Rate</Text>
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        </View>

        <View style={styles.infoSection}>
          <Card>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={24} color="#0F4C75" />
              <Text style={styles.infoTitle}>Rate Information</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoText}>
                • Rates are per 10kg basis
              </Text>
              <Text style={styles.infoText}>
                • Rate updates are effective immediately
              </Text>
              <Text style={styles.infoText}>
                • Historical rates are maintained for reporting
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Rate Update Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Rate</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Item: {selectedItem?.item_name}</Text>
              <Text style={styles.modalLabel}>New Rate (₹ per 10kg):</Text>
              <TextInput
                style={styles.rateInput}
                value={newRate}
                onChangeText={setNewRate}
                placeholder="Enter new rate"
                keyboardType="numeric"
                autoFocus
              />
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setModalVisible(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Update"
                onPress={handleRateUpdate}
                variant="primary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  summarySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  ratesGrid: {
    gap: 16,
  },
  rateCard: {
    padding: 16,
  },
  rateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rateIcon: {
    marginRight: 12,
  },
  rateInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  hsnCode: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  rateDetails: {
    marginBottom: 12,
  },
  rateValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F4C75',
    marginBottom: 4,
  },
  effectiveDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0F4C75',
  },
  updateButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F4C75',
  },
  infoSection: {
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  infoContent: {
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
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
    padding: 24,
    width: '90%',
    maxWidth: 400,
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
  closeButton: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  rateInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
}); 