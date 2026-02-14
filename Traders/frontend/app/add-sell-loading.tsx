import React from 'react';
import { SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, View, Text } from 'react-native';
import LoadingForm from '../components/forms/LoadingForm';
import { router } from 'expo-router';

export default function AddSellLoadingScreen() {
  const handleSuccess = () => {
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <LoadingForm
          type="sell"
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 