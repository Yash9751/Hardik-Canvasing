import React from 'react';
import { SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, View, Text } from 'react-native';
import PurchaseSellForm from '../components/forms/SaudaForm';
import { router, useLocalSearchParams } from 'expo-router';

export default function AddBuyScreen() {
  const params = useLocalSearchParams();
  
  const handleSuccess = () => {
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  // Convert URL params to initialData format for edit mode
  const initialData = params.edit === 'true' ? {
    id: parseInt(params.id as string),
    saudaNumber: params.sauda_no as string,
    date: params.date as string,
    partyId: params.party_id as string,
    itemId: params.item_id as string,
    quantity: params.quantity_packs as string,
    rate: params.rate_per_10kg as string,
    exPlantId: params.ex_plant_id as string,
    brokerId: params.broker_id as string,
    deliveryConditionId: params.delivery_condition_id as string,
    paymentConditionId: params.payment_condition_id as string,
    deliveryType: params.delivery_type as string || '',
    loadingDueDate: params.loading_due_date as string,
    remarks: params.remarks as string || '',
  } : undefined;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <PurchaseSellForm
          type="purchase"
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          initialData={initialData}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
} 