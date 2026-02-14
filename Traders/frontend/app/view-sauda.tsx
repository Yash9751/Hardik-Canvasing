import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { saudaAPI } from '../services/api';
import { useCompanyProfile } from '../contexts/CompanyProfileContext';
import Card from '../components/Card';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';
import { API_CONFIG } from '../config/api';

interface Sauda {
  id: number;
  sauda_no: string;
  transaction_type: 'purchase' | 'sell';
  date: string;
  party_id?: number;
  party_name: string;
  party_mobile?: string;
  party_city?: string;
  party_gstin?: string;
  item_id?: number;
  item_name: string;
  ex_plant_id?: number;
  ex_plant_name: string;
  quantity_packs: number;
  rate_per_10kg: number;
  total_value: number;
  broker_id?: number;
  broker_name: string;
  delivery_condition_id?: number;
  delivery_condition: string;
  payment_condition_id?: number;
  payment_condition: string;
  loading_due_date: string;
}

export default function ViewSaudaScreen() {
  const { companyProfile } = useCompanyProfile();
  const params = useLocalSearchParams();
  const saudaId = params.id as string;
  
  const [sauda, setSauda] = useState<Sauda | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    if (saudaId) {
      fetchSaudaDetails();
    }
  }, [saudaId]);

  const fetchSaudaDetails = async () => {
    try {
      const response = await saudaAPI.getById(parseInt(saudaId));
      setSauda(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load sauda details');
      console.error('Sauda details error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatSaudaNumber = (saudaNo: string) => {
    if (saudaNo.startsWith('20')) {
      return saudaNo.substring(2);
    }
    return saudaNo;
  };

  // Share sauda note on WhatsApp
  const handleShareOnWhatsApp = async () => {
    if (!sauda) return;
    
    try {
      if (!sauda.party_mobile) {
        Alert.alert('No Phone Number', 'Party phone number is not available for this transaction.');
        return;
      }

      // Clean the phone number
      const cleanPhone = sauda.party_mobile.replace(/[\s\-\(\)]/g, '');
      
      // Add country code if not present
      let phoneWithCode = cleanPhone;
      if (!cleanPhone.startsWith('91') && !cleanPhone.startsWith('+91')) {
        phoneWithCode = `91${cleanPhone}`;
      }
      if (phoneWithCode.startsWith('91') && !phoneWithCode.startsWith('+')) {
        phoneWithCode = `+${phoneWithCode}`;
      }

      // Create WhatsApp message
      const contractNumber = formatSaudaNumber(sauda.sauda_no);
      const quantity = `${sauda.quantity_packs} MT`;
      const rate = `${sauda.rate_per_10kg} (Per 10KGs) + GST`;
      const delivery = sauda.delivery_condition || 'Ready to Weekly';
      const payment = sauda.payment_condition || '2 nd Day';
      const loadingDate = sauda.loading_due_date ? formatDate(sauda.loading_due_date) : 'N/A';
      
      // Determine seller and buyer based on transaction type
      const companyName = companyProfile?.company_name || 'Traders';
      const companyCity = 'City';
      
      let seller, buyer;
      if (sauda.transaction_type === 'sell') {
        seller = `${companyName} (${companyCity})`;
        buyer = `${sauda.party_name} (${sauda.party_city || 'City'})`;
      } else {
        seller = `${sauda.party_name} (${sauda.party_city || 'City'})`;
        buyer = `${companyName} (${companyCity})`;
      }
      
      const gstin = sauda.transaction_type === 'sell' ? 'Buyer GSTIN' : 'Seller GSTIN';
      const gstinValue = sauda.party_gstin || 'N/A';
      const phoneNumber = companyProfile?.mobile_number || '';
      
      const message = `Please Find Contract Confirmation Sir

Sauda Date : ${formatDate(sauda.date)}
Sauda No : ${contractNumber}

Seller : ${seller}
Buyer : ${buyer}

Item : ${sauda.item_name}
Qty. : ${quantity}
Rate : ${rate}

Del. : ${delivery}
Pay. : ${payment}

Note : 
Please Try to Load Before : ${loadingDate}
${gstin} : ${gstinValue}

(Reply with Ok).
*If any mistake, Reply!*
Call - ${phoneNumber}`;

      // Send message directly to WhatsApp
      const whatsappUrl = `whatsapp://send?phone=${phoneWithCode}&text=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to web WhatsApp
        const webWhatsappUrl = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webWhatsappUrl);
      }
    } catch (error: any) {
      console.error('WhatsApp sharing error:', error);
      Alert.alert('Error', 'Failed to open WhatsApp');
    }
  };

  // Share PDF
  const handleSharePDF = async () => {
    if (!sauda) return;
    
    try {
      setDownloading(true);
      setDownloadProgress(0);
      
      const safeSaudaNo = sauda.sauda_no.replace(/[\\/:*?"<>|]+/g, '_');
      const url = `${API_CONFIG.BASE_URL}/sauda/${sauda.id}/pdf`;
      const fileUri = FileSystem.cacheDirectory + `Sauda_Note_${safeSaudaNo}.pdf`;
      
      console.log('Downloading PDF from:', url);
      console.log('Saving to:', fileUri);
      
      // Test if the URL is accessible
      try {
        const testResponse = await fetch(url, { method: 'HEAD' });
        if (!testResponse.ok) {
          throw new Error(`Server returned ${testResponse.status}: ${testResponse.statusText}`);
        }
        console.log('PDF endpoint is accessible');
      } catch (testError: any) {
        console.error('PDF endpoint test failed:', testError);
        throw new Error(`Cannot access PDF endpoint: ${testError.message}`);
      }
      
      const downloadResumable = FileSystem.createDownloadResumable(
        url, 
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
          console.log(`Download progress: ${(progress * 100).toFixed(1)}%`);
        }
      );
      
      const downloadResult = await downloadResumable.downloadAsync();
      
      if (downloadResult && downloadResult.uri) {
        console.log('PDF downloaded successfully to:', downloadResult.uri);
        
        // Check if file exists and has content
        const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
        console.log('File info:', fileInfo);
        
        if (fileInfo.exists && (fileInfo as any).size > 100) {
          console.log('PDF file is valid, size:', (fileInfo as any).size, 'bytes');
          
          // Share the PDF
          const canShare = await Sharing.isAvailableAsync();
          if (!canShare) {
            throw new Error('Sharing is not available on this device');
          }
          
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Share Sauda Note ${safeSaudaNo}`,
            UTI: 'com.adobe.pdf'
          });
        } else {
          throw new Error(`PDF file is invalid: exists=${fileInfo.exists}, size=${(fileInfo as any).size || 'unknown'} bytes. Expected size > 100 bytes.`);
        }
      } else {
        throw new Error('PDF download failed - no result');
      }
    } catch (error: any) {
      console.error('PDF sharing error:', error);
      Alert.alert('Error', 'Failed to download or share PDF: ' + error.message);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F4C75" />
        <Text style={styles.loadingText}>Loading sauda details...</Text>
      </SafeAreaView>
    );
  }

  if (!sauda) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Sauda not found</Text>
      </SafeAreaView>
    );
  }

  // Determine seller and buyer based on transaction type
  const companyName = companyProfile?.company_name || 'Traders';
  const companyCity = 'City';
  
  let seller, buyer;
  if (sauda.transaction_type === 'sell') {
    seller = `${companyName} (${companyCity})`;
    buyer = `${sauda.party_name} (${sauda.party_city || 'City'})`;
  } else {
    seller = `${sauda.party_name} (${sauda.party_city || 'City'})`;
    buyer = `${companyName} (${companyCity})`;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.title}>Sauda Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sauda Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.saudaHeader}>
            <View style={styles.saudaInfo}>
              <View style={styles.saudaTopRow}>
                <Text style={styles.saudaNo}>{formatSaudaNumber(sauda.sauda_no)}</Text>
                <View style={[
                  styles.typeBadge,
                  sauda.transaction_type === 'purchase' ? styles.purchaseBadge : styles.sellBadge
                ]}>
                  <Ionicons 
                    name={sauda.transaction_type === 'purchase' ? 'trending-up' : 'trending-down'} 
                    size={12} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.typeText}>
                    {sauda.transaction_type.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.saudaDate}>{formatDate(sauda.date)}</Text>
            </View>
          </View>
        </Card>

        {/* Transaction Details */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Seller:</Text>
            <Text style={styles.detailValue}>{seller}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Buyer:</Text>
            <Text style={styles.detailValue}>{buyer}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Item:</Text>
            <Text style={styles.detailValue}>{sauda.item_name}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ex-Plant:</Text>
            <Text style={styles.detailValue}>{sauda.ex_plant_name || 'N/A'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity:</Text>
            <Text style={styles.detailValue}>{sauda.quantity_packs} MT</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Rate:</Text>
            <Text style={styles.detailValue}>{formatCurrency(sauda.rate_per_10kg)} (Per 10KGs) + GST</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Value:</Text>
            <Text style={[styles.detailValue, styles.totalValue]}>
              {formatCurrency(sauda.total_value)}
            </Text>
          </View>
        </Card>

        {/* Terms & Conditions */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          
          {sauda.broker_name && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Broker:</Text>
              <Text style={styles.detailValue}>{sauda.broker_name}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivery:</Text>
            <Text style={styles.detailValue}>{sauda.delivery_condition || 'Ready to Weekly'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment:</Text>
            <Text style={styles.detailValue}>{sauda.payment_condition || '2 nd Day'}</Text>
          </View>
          
          {sauda.loading_due_date && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Loading Due:</Text>
              <Text style={styles.detailValue}>{formatDate(sauda.loading_due_date)}</Text>
            </View>
          )}
        </Card>

        {/* Party Information */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Party Information</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name:</Text>
            <Text style={styles.detailValue}>{sauda.party_name}</Text>
          </View>
          
          {sauda.party_city && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>City:</Text>
              <Text style={styles.detailValue}>{sauda.party_city}</Text>
            </View>
          )}
          
          {sauda.party_mobile && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mobile:</Text>
              <Text style={styles.detailValue}>{sauda.party_mobile}</Text>
            </View>
          )}
          
          {sauda.party_gstin && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>GSTIN:</Text>
              <Text style={styles.detailValue}>{sauda.party_gstin}</Text>
            </View>
          )}
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {sauda.party_mobile && (
            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={handleShareOnWhatsApp}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
              <Text style={styles.whatsappButtonText}>Send Message</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleSharePDF}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.shareButtonText}>
                  {downloadProgress > 0 ? `${(downloadProgress * 100).toFixed(0)}%` : 'Downloading...'}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>Share</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    marginTop: 16,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
  },
  saudaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  saudaInfo: {
    flex: 1,
  },
  saudaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  saudaNo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  purchaseBadge: {
    backgroundColor: '#2ECC71',
  },
  sellBadge: {
    backgroundColor: '#E74C3C',
  },
  typeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  saudaDate: {
    fontSize: 16,
    color: '#6B7280',
  },
  detailsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F4C75',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F4C75',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#0F4C75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
}); 