import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useCompanyProfile } from '../../contexts/CompanyProfileContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CompanyProfileScreen() {
  const { logout } = useAuth();
  const { companyProfile, updateCompanyProfile, isLoading } = useCompanyProfile();
  
  const [formData, setFormData] = useState({
    company_name: companyProfile?.company_name || '',
    gst_number: companyProfile?.gst_number || '',
    mobile_number: companyProfile?.mobile_number || '',
    email: companyProfile?.email || '',
    address: companyProfile?.address || '',
    business_type: companyProfile?.business_type || '',
  });
  
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.company_name.trim()) {
      Alert.alert('Error', 'Company name is required');
      return;
    }

    setSaving(true);
    try {
      const success = await updateCompanyProfile(formData);
      if (success) {
        Alert.alert('Success', 'Company profile updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update company profile');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while updating');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading company profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Company Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Input
            label="Company Name"
            value={formData.company_name}
            onChangeText={(text) => setFormData({ ...formData, company_name: text })}
            placeholder="Enter company name"
          />

          <Input
            label="GST Number"
            value={formData.gst_number}
            onChangeText={(text) => setFormData({ ...formData, gst_number: text })}
            placeholder="Enter GST number"
          />

          <Input
            label="Mobile Number"
            value={formData.mobile_number}
            onChangeText={(text) => setFormData({ ...formData, mobile_number: text })}
            placeholder="Enter mobile number"
            keyboardType="phone-pad"
          />

          <Input
            label="Email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Address"
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Enter company address"
            multiline
            numberOfLines={3}
          />

          <Input
            label="Business Type"
            value={formData.business_type}
            onChangeText={(text) => setFormData({ ...formData, business_type: text })}
            placeholder="Enter business type"
          />

          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
            style={styles.saveButton}
          />
        </View>

        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  saveButton: {
    marginTop: 20,
  },
  logoutSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
}); 