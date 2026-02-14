import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Card from '../Card';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingsOption {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
  route: string;
}

const settingsOptions: SettingsOption[] = [
  {
    id: 'company-profile',
    title: 'Company Profile',
    icon: 'business',
    color: '#007AFF',
    description: 'Manage company information and logout',
    route: '/settings/company-profile'
  },
  {
    id: 'parties',
    title: 'Parties',
    icon: 'people',
    color: '#0F4C75',
    description: 'Manage buyers and sellers',
    route: '/settings/parties'
  },
  {
    id: 'sauda',
    title: 'Sauda',
    icon: 'document-text',
    color: '#2ECC71',
    description: 'View and manage transactions',
    route: '/settings/sauda'
  },
  {
    id: 'brokers',
    title: 'Brokers',
    icon: 'person',
    color: '#E67E22',
    description: 'Manage broker information',
    route: '/settings/brokers'
  },
  {
    id: 'items',
    title: 'Items',
    icon: 'cube',
    color: '#9B59B6',
    description: 'Manage trading items',
    route: '/settings/items'
  },
  {
    id: 'ex-plants',
    title: 'Ex Plants',
    icon: 'business',
    color: '#E74C3C',
    description: 'Manage ex-plant locations',
    route: '/settings/ex-plants'
  },
  {
    id: 'delivery-conditions',
    title: 'Delivery Conditions',
    icon: 'car',
    color: '#F39C12',
    description: 'Manage delivery terms',
    route: '/settings/delivery-conditions'
  },
  {
    id: 'payment-conditions',
    title: 'Payment Conditions',
    icon: 'card',
    color: '#1ABC9C',
    description: 'Manage payment terms',
    route: '/settings/payment-conditions'
  },
  {
    id: 'loading',
    title: 'Loading',
    icon: 'car-sport',
    color: '#34495E',
    description: 'Manage loading records',
    route: '/settings/loading'
  },
  {
    id: 'rates',
    title: 'Rates',
    icon: 'trending-up',
    color: '#27AE60',
    description: 'Manage item rates',
    route: '/settings/rates'
  },
];

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleOptionPress = (option: SettingsOption) => {
    setLoading(option.id);
    if (option.id === 'company-profile') {
      router.push('/settings/company-profile');
    } else if (option.id === 'parties') {
      router.push('/settings/parties');
    } else if (option.id === 'brokers') {
      router.push('/settings/brokers');
    } else if (option.id === 'items') {
      router.push('/settings/items');
    } else if (option.id === 'ex-plants') {
      router.push('/settings/ex-plants');
    } else if (option.id === 'delivery-conditions') {
      router.push('/settings/delivery-conditions');
    } else if (option.id === 'payment-conditions') {
      router.push('/settings/payment-conditions');
    } else if (option.id === 'loading') {
      router.push('/settings/loading');
    } else if (option.id === 'sauda') {
      router.push('/settings/sauda');
    } else {
      // For now, we'll use a simple navigation approach
      // TODO: Create the actual settings pages
      Alert.alert('Coming Soon', `${option.title} management will be available soon!`);
    }
    onClose();
    setLoading(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>Manage Data</Text>
          <View style={styles.optionsGrid}>
            {settingsOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionCard}
                onPress={() => handleOptionPress(option)}
                disabled={loading === option.id}
                activeOpacity={0.7}
              >
                {loading === option.id ? (
                  <ActivityIndicator size="small" color={option.color} />
                ) : (
                  <Ionicons name={option.icon} size={32} color={option.color} />
                )}
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
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
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  optionCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 120,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
}); 