import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ItemForm from '../components/forms/ItemForm';
import { router } from 'expo-router';

export default function AddItemScreen() {
  const handleSuccess = () => {
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ItemForm 
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </SafeAreaView>
  );
} 