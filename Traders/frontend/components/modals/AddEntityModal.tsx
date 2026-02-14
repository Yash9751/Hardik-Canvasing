import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AddEntityModalProps {
  visible: boolean;
  title: string;
  entityName: string;
  entityType: 'item' | 'party' | 'exPlant' | 'broker' | 'deliveryCondition' | 'paymentCondition' | 'transport';
  onClose: () => void;
  onAdd: (data: any) => Promise<void>;
  placeholder?: string;
  validation?: (data: any) => string | null;
}

export default function AddEntityModal({
  visible,
  title,
  entityName,
  entityType,
  onClose,
  onAdd,
  placeholder = `Enter ${entityName} name`,
  validation,
}: AddEntityModalProps) {
  // State for all possible fields
  const [fields, setFields] = useState<any>({
    name: '',
    nickName: '',
    hsnCode: '',
    city: '',
    gstNo: '',
    contactPerson: '',
    mobileNumber: '',
    email: '',
    partyType: 'both',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset fields on open/close
  React.useEffect(() => {
    if (!visible) {
      setFields({
        name: '',
        nickName: '',
        hsnCode: '',
        city: '',
        gstNo: '',
        contactPerson: '',
        mobileNumber: '',
        email: '',
        partyType: 'both',
      });
      setError('');
    }
  }, [visible]);

  const handleAdd = async () => {
    // Validation per entity type
    if (entityType === 'item') {
      if (!fields.name.trim()) return setError('Item name is required');
      if (!fields.nickName.trim()) return setError('Nick name is required');
      if (!fields.hsnCode.trim()) return setError('HSN code is required');
    } else if (entityType === 'party') {
      if (!fields.name.trim()) return setError('Party name is required');
    } else if (entityType === 'exPlant') {
      if (!fields.name.trim()) return setError('Ex Plant name is required');
    } else if (entityType === 'broker') {
      if (!fields.name.trim()) return setError('Broker name is required');
    } else if (entityType === 'deliveryCondition' || entityType === 'paymentCondition') {
      if (!fields.name.trim()) return setError('Condition name is required');
    } else if (entityType === 'transport') {
      if (!fields.name.trim()) return setError('Transport company name is required');
    }
    // Custom validation
    if (validation) {
      const validationError = validation(fields);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    setLoading(true);
    setError('');
    try {
      await onAdd(fields);
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to add ${entityName}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError('');
      onClose();
    }
  };

  // Render fields based on entityType
  const renderFields = () => {
    switch (entityType) {
      case 'item':
        return <>
          <Text style={styles.label}>Item Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, error && !fields.name && styles.inputError]}
            placeholder="Enter item name"
            value={fields.name}
            onChangeText={text => setFields((f: any) => ({ ...f, name: text }))}
            autoFocus
            editable={!loading}
          />
          <Text style={styles.label}>Nick Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, error && !fields.nickName && styles.inputError]}
            placeholder="Enter nick name"
            value={fields.nickName}
            onChangeText={text => setFields((f: any) => ({ ...f, nickName: text }))}
            editable={!loading}
            autoCapitalize="words"
          />
          <Text style={styles.label}>HSN Code <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, error && !fields.hsnCode && styles.inputError]}
            placeholder="Enter HSN code"
            value={fields.hsnCode}
            onChangeText={text => setFields((f: any) => ({ ...f, hsnCode: text }))}
            editable={!loading}
            autoCapitalize="characters"
          />
        </>;
      case 'party':
        return <>
          <Text style={styles.label}>Party Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, error && !fields.name && styles.inputError]}
            placeholder="Enter party name"
            value={fields.name}
            onChangeText={text => setFields((f: any) => ({ ...f, name: text }))}
            autoFocus
            editable={!loading}
          />
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter city"
            value={fields.city}
            onChangeText={text => setFields((f: any) => ({ ...f, city: text }))}
            editable={!loading}
          />
          <Text style={styles.label}>GST No</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter GST number"
            value={fields.gstNo}
            onChangeText={text => setFields((f: any) => ({ ...f, gstNo: text }))}
            editable={!loading}
          />
          <Text style={styles.label}>Contact Person</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter contact person"
            value={fields.contactPerson}
            onChangeText={text => setFields((f: any) => ({ ...f, contactPerson: text }))}
            editable={!loading}
          />
          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter mobile number"
            value={fields.mobileNumber}
            onChangeText={text => setFields((f: any) => ({ ...f, mobileNumber: text }))}
            keyboardType="phone-pad"
            editable={!loading}
          />
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email"
            value={fields.email}
            onChangeText={text => setFields((f: any) => ({ ...f, email: text }))}
            keyboardType="email-address"
            editable={!loading}
          />
          <Text style={styles.label}>Party Type</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            {['buyer', 'seller', 'both'].map(type => (
              <TouchableOpacity
                key={type}
                style={{
                  backgroundColor: fields.partyType === type ? '#0F4C75' : '#F3F4F6',
                  borderRadius: 6,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                }}
                onPress={() => setFields((f: any) => ({ ...f, partyType: type }))}
                disabled={loading}
              >
                <Text style={{ color: fields.partyType === type ? '#FFF' : '#374151', fontWeight: '600' }}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>;
      case 'exPlant':
        return <>
          <Text style={styles.label}>Ex Plant Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, error && !fields.name && styles.inputError]}
            placeholder="Enter ex plant name"
            value={fields.name}
            onChangeText={text => setFields((f: any) => ({ ...f, name: text }))}
            autoFocus
            editable={!loading}
          />
        </>;
      case 'broker':
        return <>
          <Text style={styles.label}>Broker Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, error && !fields.name && styles.inputError]}
            placeholder="Enter broker name"
            value={fields.name}
            onChangeText={text => setFields((f: any) => ({ ...f, name: text }))}
            autoFocus
            editable={!loading}
          />
        </>;
      case 'deliveryCondition':
      case 'paymentCondition':
        return <>
          <Text style={styles.label}>Condition Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, error && !fields.name && styles.inputError]}
            placeholder="Enter condition name"
            value={fields.name}
            onChangeText={text => setFields((f: any) => ({ ...f, name: text }))}
            autoFocus
            editable={!loading}
          />
        </>;
      case 'transport':
        return <>
          <Text style={styles.label}>Transport Company Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, error && !fields.name && styles.inputError]}
            placeholder="Enter transport company name"
            value={fields.name}
            onChangeText={text => setFields((f: any) => ({ ...f, name: text }))}
            autoFocus
            editable={!loading}
          />
        </>;
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={60}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center' }]}> 
          <View style={styles.modalContent}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity onPress={handleClose} disabled={loading}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.form}>
                {renderFields()}
                {error && (
                  <Text style={styles.errorText}>{error}</Text>
                )}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={handleClose}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.addButton, loading && styles.disabledButton]}
                    onPress={handleAdd}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.addButtonText}>Add {entityName}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    minHeight: 200,
    alignSelf: 'center',
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
  form: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#E74C3C',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#E74C3C',
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 14,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#2ECC71',
  },
  disabledButton: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 