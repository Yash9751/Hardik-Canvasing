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
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as DocumentPicker from 'expo-document-picker';
import { vendorsAPI, itemsAPI } from '../services/api';
import Card from '../components/Card';
import Header from '../components/Header';
import Button from '../components/Button';
import Input from '../components/Input';

interface Vendor {
  id: number;
  vendor_name: string;
  contact_person: string;
  mobile_number: string;
  whatsapp_number: string;
  email: string;
  city: string;
  vendor_type: string;
  is_active: boolean;
  channels: string[];
}

interface Channel {
  id: number;
  channel_name: string;
  city: string;
  description: string;
  is_active: boolean;
  vendor_count: number;
}

interface Item {
  id: number;
  item_name: string;
  nick_name: string;
  hsn_code: string;
}

interface ChannelRate {
  item_id: number;
  rate_per_10kg: number;
}

interface BroadcastMessage {
  channel: Channel;
  rates: any[];
  vendors: Vendor[];
  message: string;
  recipients_count: number;
}

export default function BroadcastRatesScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelRates, setChannelRates] = useState<ChannelRate[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState<BroadcastMessage | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [newChannel, setNewChannel] = useState({
    channel_name: '',
    city: '',
    description: ''
  });
  const [selectedVendors, setSelectedVendors] = useState<number[]>([]);
  const [vendorsInChannel, setVendorsInChannel] = useState<Vendor[]>([]);
  const [messagingStatus, setMessagingStatus] = useState<any>(null);
  const [directMessageInstructions, setDirectMessageInstructions] = useState<any>(null);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  const fetchData = async () => {
    try {
      const [vendorsResponse, channelsResponse, itemsResponse] = await Promise.all([
        vendorsAPI.getAll(),
        vendorsAPI.getAllChannels(),
        itemsAPI.getAll()
      ]);
      setVendors(vendorsResponse.data);
      setChannels(channelsResponse.data);
      setItems(itemsResponse.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load data');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      
      // Create a File object from the picked document
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const fileObj = new File([blob], file.name, { type: file.mimeType || 'text/csv' });

      const apiResponse = await vendorsAPI.importCSV(fileObj);

      Alert.alert(
        'Success',
        `${apiResponse.data.message}\n\nImported: ${apiResponse.data.imported}\nErrors: ${apiResponse.data.errors || 0}`
      );

      fetchData(); // Refresh the data
      setShowImportModal(false);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to import CSV file');
      console.error('Import error:', error);
    }
  };

  const handleImportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/vcard', 'application/vcard'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const fileExtension = file.name.toLowerCase().split('.').pop() || '';

      if (!['csv', 'vcf'].includes(fileExtension)) {
        Alert.alert('Error', 'Please select a CSV or VCF file');
        return;
      }

      // Create a File object from the picked document
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const fileObj = new File([blob], file.name, { type: file.mimeType || 'text/plain' });

      let apiResponse;
      if (fileExtension === 'csv') {
        apiResponse = await vendorsAPI.importCSV(fileObj);
      } else if (fileExtension === 'vcf') {
        apiResponse = await vendorsAPI.importVCF(fileObj);
      } else {
        // Use unified import
        apiResponse = await vendorsAPI.importFile(fileObj);
      }

      Alert.alert(
        'Success',
        `${apiResponse.data.message}\n\nImported: ${apiResponse.data.imported}\nErrors: ${apiResponse.data.errors || 0}`
      );

      fetchData(); // Refresh the data
      setShowImportModal(false);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to import file');
      console.error('Import error:', error);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannel.channel_name) {
      Alert.alert('Error', 'Channel name is required');
      return;
    }

    try {
      await vendorsAPI.createChannel(newChannel);
      setShowChannelModal(false);
      setNewChannel({
        channel_name: '',
        city: '',
        description: ''
      });
      fetchData();
      Alert.alert('Success', 'Channel created successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create channel');
    }
  };

  const handleSetChannelRates = async () => {
    if (!selectedChannel || channelRates.length === 0) {
      Alert.alert('Error', 'Please select a channel and set rates');
      return;
    }

    try {
      await vendorsAPI.setChannelRates({
        channel_id: selectedChannel.id,
        rates: channelRates
      });
      setShowRatesModal(false);
      setChannelRates([]);
      Alert.alert('Success', 'Channel rates set successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to set rates');
    }
  };

  const handleGenerateMessage = async (channel: Channel) => {
    try {
      const response = await vendorsAPI.generateChannelBroadcastMessage(channel.id);
      
      setBroadcastMessage(response.data);
      setShowMessageModal(true);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to generate broadcast message');
      console.error('Generate error:', error);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!broadcastMessage) return;
    
    try {
      Alert.alert(
        'Generate Messaging Instructions',
        `This will generate WhatsApp and SMS links for ${broadcastMessage.recipients_count} contacts in ${broadcastMessage.channel.channel_name}. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Generate', 
            onPress: async () => {
              try {
                const response = await vendorsAPI.generateDirectMessageInstructions(
                  broadcastMessage.channel.id,
                  broadcastMessage.message
                );
                
                setDirectMessageInstructions(response.data);
                setShowInstructionsModal(true);
                setShowMessageModal(false);
                setBroadcastMessage(null);
              } catch (error: any) {
                Alert.alert('Error', 'Failed to generate messaging instructions');
                console.error('Generate error:', error);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to prepare messaging instructions');
      console.error('Send error:', error);
    }
  };

  const handleSendActualMessages = async (preferWhatsApp: boolean = true) => {
    if (!broadcastMessage) return;
    
    const method = preferWhatsApp ? 'WhatsApp' : 'SMS';
    
    try {
      Alert.alert(
        `Send ${method} Messages`,
        `This will send the message to ${broadcastMessage.recipients_count} contacts in ${broadcastMessage.channel.channel_name} using Twilio. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: `Send ${method}`, 
            onPress: async () => {
              try {
                const response = await vendorsAPI.sendActualMessages(
                  broadcastMessage.channel.id,
                  broadcastMessage.message,
                  preferWhatsApp
                );
                
                Alert.alert(
                  'Messages Sent',
                  `Successfully sent ${method} messages to ${response.data.successCount} out of ${response.data.totalCount} contacts.`,
                  [{ text: 'OK' }]
                );
                
                setShowMessageModal(false);
                setBroadcastMessage(null);
              } catch (error: any) {
                Alert.alert('Error', `Failed to send ${method} messages: ${error.response?.data?.error || error.message}`);
                console.error('Send error:', error);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', `Failed to prepare ${method} messages`);
      console.error('Send error:', error);
    }
  };

  const checkMessagingStatus = async () => {
    try {
      const response = await vendorsAPI.getMessagingStatus();
      setMessagingStatus(response.data);
    } catch (error: any) {
      console.error('Error checking messaging status:', error);
    }
  };

  const handleExportCSV = async () => {
    if (!broadcastMessage) return;
    
    try {
      const response = await vendorsAPI.generateMessagingCSV(
        broadcastMessage.channel.id,
        broadcastMessage.message
      );
      
      // Handle CSV download
      Alert.alert('Success', 'CSV file generated successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to generate CSV');
      console.error('CSV error:', error);
    }
  };

  const handleManageContacts = async (channel: Channel) => {
    try {
      setSelectedChannel(channel);
      const response = await vendorsAPI.getVendorsInChannel(channel.id);
      setVendorsInChannel(response.data);
      setSelectedVendors(response.data.map((v: Vendor) => v.id));
      setShowContactsModal(true);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load channel contacts');
      console.error('Load contacts error:', error);
    }
  };

  const handleSaveContacts = async () => {
    if (!selectedChannel) return;
    
    try {
      await vendorsAPI.addVendorsToChannel(selectedChannel.id, selectedVendors);
      Alert.alert('Success', 'Contacts updated successfully');
      setShowContactsModal(false);
      fetchData(); // Refresh data
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update contacts');
      console.error('Save contacts error:', error);
    }
  };

  const toggleVendorSelection = (vendorId: number) => {
    setSelectedVendors(prev => 
      prev.includes(vendorId) 
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const updateChannelRate = (itemId: number, rate: string) => {
    const rateValue = parseFloat(rate) || 0;
    setChannelRates(prev => {
      const existing = prev.find(r => r.item_id === itemId);
      if (existing) {
        return prev.map(r => r.item_id === itemId ? { ...r, rate_per_10kg: rateValue } : r);
      } else {
        return [...prev, { item_id: itemId, rate_per_10kg: rateValue }];
      }
    });
  };

  const getChannelRate = (itemId: number) => {
    const rate = channelRates.find(r => r.item_id === itemId);
    return rate ? rate.rate_per_10kg.toString() : '';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F4C75" />
        <Text style={styles.loadingText}>Loading broadcast system...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Broadcast Rates" 
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Direct Messaging Status Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Direct Messaging</Text>
            <TouchableOpacity
              style={styles.messagingButton}
              onPress={checkMessagingStatus}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.messagingButtonText}>Check Status</Text>
            </TouchableOpacity>
          </View>
          
          <Card style={styles.statusCard}>
            <Text style={styles.statusText}>
              Status: ✅ Direct messaging ready
            </Text>
            <Text style={styles.statusSubtext}>
              Generate WhatsApp and SMS links for bulk messaging
            </Text>
          </Card>
        </View>

        {/* Import Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Import Contacts</Text>
            <TouchableOpacity
              style={styles.importButton}
              onPress={() => setShowImportModal(true)}
            >
              <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
              <Text style={styles.importButtonText}>Import CSV</Text>
            </TouchableOpacity>
          </View>
          
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>CSV Format Required:</Text>
            <Text style={styles.infoText}>vendor_name, contact_person, mobile_number, whatsapp_number, email, city, vendor_type</Text>
            <Text style={styles.infoSubtext}>Download sample CSV template</Text>
          </Card>
        </View>

        {/* Channels Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Broadcast Channels</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowChannelModal(true)}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Channel</Text>
            </TouchableOpacity>
          </View>

          {channels.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No channels found</Text>
              <Text style={styles.emptySubtext}>Create broadcast channels to organize your contacts</Text>
            </Card>
          ) : (
            <View style={styles.channelsList}>
              {channels.map((channel) => (
                <Card key={channel.id} style={styles.channelCard}>
                  <View style={styles.channelHeader}>
                    <View style={styles.channelInfo}>
                      <Text style={styles.channelName}>{channel.channel_name}</Text>
                      <Text style={styles.channelLocation}>{channel.city}</Text>
                      <Text style={styles.channelDescription}>{channel.description}</Text>
                      <Text style={styles.vendorCount}>{channel.vendor_count} contacts</Text>
                    </View>
                    <View style={styles.channelActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleManageContacts(channel)}
                      >
                        <Ionicons name="people" size={16} color="#0F4C75" />
                        <Text style={styles.actionButtonText}>Contacts</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          setSelectedChannel(channel);
                          setShowRatesModal(true);
                        }}
                      >
                        <Ionicons name="pricetag" size={16} color="#0F4C75" />
                        <Text style={styles.actionButtonText}>Set Rates</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.broadcastButton]}
                        onPress={() => handleGenerateMessage(channel)}
                      >
                        <Ionicons name="share-social" size={16} color="#FFFFFF" />
                        <Text style={[styles.actionButtonText, styles.broadcastButtonText]}>Broadcast</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* Vendors Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Contacts ({vendors.length})</Text>
          <View style={styles.vendorsList}>
            {vendors.slice(0, 5).map((vendor) => (
              <Card key={vendor.id} style={styles.vendorCard}>
                <View style={styles.vendorInfo}>
                  <Text style={styles.vendorName}>{vendor.vendor_name}</Text>
                  <Text style={styles.vendorContact}>
                    {vendor.contact_person} • {vendor.mobile_number}
                  </Text>
                  <Text style={styles.vendorLocation}>{vendor.city}</Text>
                  {vendor.channels && vendor.channels.length > 0 && (
                    <Text style={styles.vendorChannels}>
                      Channels: {vendor.channels.join(', ')}
                    </Text>
                  )}
                </View>
              </Card>
            ))}
            {vendors.length > 5 && (
              <TouchableOpacity style={styles.viewMoreButton}>
                <Text style={styles.viewMoreText}>View all {vendors.length} contacts</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Import Contacts Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showImportModal}
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Import Contacts</Text>
              <TouchableOpacity
                onPress={() => setShowImportModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                Import your contacts from CSV or VCF (vCard) files.
              </Text>

              <View style={styles.importOptions}>
                <TouchableOpacity
                  style={styles.importOption}
                  onPress={handleImportCSV}
                >
                  <Ionicons name="document-text" size={24} color="#0F4C75" />
                  <Text style={styles.importOptionText}>Import CSV</Text>
                  <Text style={styles.importOptionDesc}>Spreadsheet format</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.importOption}
                  onPress={handleImportFile}
                >
                  <Ionicons name="card" size={24} color="#25D366" />
                  <Text style={styles.importOptionText}>Import VCF</Text>
                  <Text style={styles.importOptionDesc}>vCard format</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.importOption}
                  onPress={handleImportFile}
                >
                  <Ionicons name="folder-open" size={24} color="#6B7280" />
                  <Text style={styles.importOptionText}>Import Any File</Text>
                  <Text style={styles.importOptionDesc}>Auto-detect format</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sampleSection}>
                <Text style={styles.sampleTitle}>Sample CSV Format:</Text>
                <Text style={styles.sampleText}>
                  vendor_name,contact_person,mobile_number,whatsapp_number,email,city,vendor_type{'\n'}
                  John Doe,John,9876543210,9876543210,john@example.com,Mumbai,customer
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowImportModal(false)}
                variant="secondary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Channel Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showChannelModal}
        onRequestClose={() => setShowChannelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Broadcast Channel</Text>
              <TouchableOpacity
                onPress={() => setShowChannelModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Input
                label="Channel Name *"
                value={newChannel.channel_name}
                onChangeText={(text) => setNewChannel(prev => ({ ...prev, channel_name: text }))}
                placeholder="e.g., Mumbai, Pune, Delhi"
              />
              <Input
                label="City"
                value={newChannel.city}
                onChangeText={(text) => setNewChannel(prev => ({ ...prev, city: text }))}
                placeholder="Enter city name"
              />
              <Input
                label="Description"
                value={newChannel.description}
                onChangeText={(text) => setNewChannel(prev => ({ ...prev, description: text }))}
                placeholder="Enter channel description"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowChannelModal(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Create Channel"
                onPress={handleCreateChannel}
                variant="primary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Set Channel Rates Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showRatesModal}
        onRequestClose={() => setShowRatesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Set Rates for {selectedChannel?.channel_name}
              </Text>
              <TouchableOpacity
                onPress={() => setShowRatesModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {items.map((item) => (
                <View key={item.id} style={styles.rateInputContainer}>
                  <Text style={styles.rateInputLabel}>
                    {item.nick_name || item.item_name}
                  </Text>
                  <TextInput
                    style={styles.rateInput}
                    value={getChannelRate(item.id)}
                    onChangeText={(text) => updateChannelRate(item.id, text)}
                    placeholder="Enter rate per 10kg"
                    keyboardType="numeric"
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowRatesModal(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Set Rates"
                onPress={handleSetChannelRates}
                variant="primary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Broadcast Message Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showMessageModal}
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Broadcast to {broadcastMessage?.channel.channel_name}
              </Text>
              <TouchableOpacity
                onPress={() => setShowMessageModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.messageHeader}>
                <Text style={styles.recipientsCount}>
                  Recipients: {broadcastMessage?.recipients_count} contacts
                </Text>
              </View>
              <Text style={styles.messageText}>
                {broadcastMessage?.message}
              </Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <View style={styles.messageOptions}>
                <Text style={styles.optionsTitle}>Choose your messaging method:</Text>
                
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => handleSendWhatsApp()}
                >
                  <Ionicons name="link" size={20} color="#0F4C75" />
                  <Text style={styles.optionButtonText}>Generate Links (Manual)</Text>
                  <Text style={styles.optionDescription}>Get WhatsApp/SMS links to send manually</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => handleSendActualMessages(true)}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                  <Text style={styles.optionButtonText}>Send WhatsApp (Auto)</Text>
                  <Text style={styles.optionDescription}>Send via Twilio WhatsApp API</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => handleSendActualMessages(false)}
                >
                  <Ionicons name="chatbubble" size={20} color="#0F4C75" />
                  <Text style={styles.optionButtonText}>Send SMS (Auto)</Text>
                  <Text style={styles.optionDescription}>Send via Twilio SMS API</Text>
                </TouchableOpacity>
              </View>

              <Button
                title="Cancel"
                onPress={() => setShowMessageModal(false)}
                variant="secondary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Direct Messaging Instructions Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showInstructionsModal}
        onRequestClose={() => setShowInstructionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Messaging Instructions
              </Text>
              <TouchableOpacity
                onPress={() => setShowInstructionsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {directMessageInstructions && (
                <>
                  <View style={styles.instructionsHeader}>
                    <Text style={styles.instructionsTitle}>
                      Message for {directMessageInstructions.totalRecipients} contacts
                    </Text>
                    <Text style={styles.messagePreview}>
                      {directMessageInstructions.instructions.message}
                    </Text>
                  </View>

                  <View style={styles.instructionsSection}>
                    <Text style={styles.sectionTitle}>WhatsApp Links:</Text>
                    {directMessageInstructions.instructions.whatsappLinks.map((link: any, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.linkItem}
                        onPress={() => Linking.openURL(link.link)}
                      >
                        <Text style={styles.linkName}>{link.name}</Text>
                        <Text style={styles.linkPhone}>{link.phone}</Text>
                        <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.instructionsSection}>
                    <Text style={styles.sectionTitle}>SMS Links:</Text>
                    {directMessageInstructions.instructions.smsLinks.map((link: any, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.linkItem}
                        onPress={() => Linking.openURL(link.link)}
                      >
                        <Text style={styles.linkName}>{link.name}</Text>
                        <Text style={styles.linkPhone}>{link.phone}</Text>
                        <Ionicons name="chatbubble" size={16} color="#0F4C75" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Export CSV"
                onPress={handleExportCSV}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Close"
                onPress={() => setShowInstructionsModal(false)}
                variant="primary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Contacts Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showContactsModal}
        onRequestClose={() => setShowContactsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Manage Contacts - {selectedChannel?.channel_name}
              </Text>
              <TouchableOpacity
                onPress={() => setShowContactsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalText}>
                Select contacts to add to this broadcast channel:
              </Text>
              
              <View style={styles.contactsList}>
                {vendors.map((vendor) => (
                  <TouchableOpacity
                    key={vendor.id}
                    style={[
                      styles.contactItem,
                      selectedVendors.includes(vendor.id) && styles.contactItemSelected
                    ]}
                    onPress={() => toggleVendorSelection(vendor.id)}
                  >
                    <View style={styles.contactCheckbox}>
                      <Ionicons 
                        name={selectedVendors.includes(vendor.id) ? "checkmark-circle" : "ellipse-outline"} 
                        size={20} 
                        color={selectedVendors.includes(vendor.id) ? "#059669" : "#6B7280"} 
                      />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{vendor.vendor_name}</Text>
                      <Text style={styles.contactPhone}>
                        {vendor.contact_person} • {vendor.mobile_number}
                      </Text>
                      <Text style={styles.contactLocation}>{vendor.city}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowContactsModal(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Save Contacts"
                onPress={handleSaveContacts}
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
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F4C75',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  infoCard: {
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  channelsList: {
    gap: 12,
  },
  channelCard: {
    padding: 16,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  channelLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  channelDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  vendorCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  channelActions: {
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0F4C75',
    backgroundColor: '#FFFFFF',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F4C75',
    marginLeft: 4,
  },
  broadcastButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  broadcastButtonText: {
    color: '#FFFFFF',
  },
  vendorsList: {
    gap: 8,
  },
  vendorCard: {
    padding: 12,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  vendorContact: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  vendorLocation: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  vendorChannels: {
    fontSize: 10,
    color: '#059669',
    fontStyle: 'italic',
  },
  viewMoreButton: {
    padding: 12,
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 14,
    color: '#0F4C75',
    fontWeight: '600',
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
    maxHeight: '80%',
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
  modalText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  csvFormat: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  rateInputContainer: {
    marginBottom: 16,
  },
  rateInputLabel: {
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
  messageHeader: {
    marginBottom: 12,
  },
  recipientsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  messageText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  contactsList: {
    marginTop: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  contactItemSelected: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  contactCheckbox: {
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  contactLocation: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  messagingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F4C75',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  messagingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusCard: {
    marginTop: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  statusSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  instructionsHeader: {
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  messagePreview: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  instructionsSection: {
    marginTop: 16,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  linkName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  linkPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  messageOptions: {
    marginBottom: 16,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  optionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
  },
  optionDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  modalDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  importOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  importOption: {
    alignItems: 'center',
    width: '30%',
  },
  importOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
  },
  importOptionDesc: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  sampleSection: {
    marginTop: 16,
  },
  sampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  sampleText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
  },
}); 