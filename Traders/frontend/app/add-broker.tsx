import React from 'react';
import { SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, View, Text } from 'react-native';
import BrokerForm from '../components/forms/BrokerForm';
import { router } from 'expo-router';

export default function AddBrokerScreen() {
  const handleSuccess = () => {
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <BrokerForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
} 