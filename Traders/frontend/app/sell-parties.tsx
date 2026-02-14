import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { stockAPI } from '../services/api';
import Card from '../components/Card';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface PartyBreakdown {
  party_name: string;
  buy_packs: number;
  buy_value: number;
  buy_loaded_packs: number;
  buy_loaded_value: number;
  avg_buy_rate: number;
  sell_packs: number;
  sell_value: number;
  sell_loaded_packs: number;
  sell_loaded_value: number;
  avg_sell_rate: number;
  net_packs: number;
  net_value: number;
  pending_buy_packs: number;
  pending_sell_packs: number;
}

export default function SellPartiesScreen() {
  const params = useLocalSearchParams();
  const { itemId, itemName, exPlantId, exPlantName } = params;
  
  const [partyBreakdown, setPartyBreakdown] = useState<PartyBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartyBreakdown();
  }, []);

  const fetchPartyBreakdown = async () => {
    try {
      setLoading(true);
      const response = await stockAPI.getPartyBreakdown({ 
        status: undefined
      });
      
      // Find the specific item/ex-plant combination
      const itemData = response.data.find(
        (item: any) => item.item_id === Number(itemId) && item.ex_plant_id === Number(exPlantId)
      );
      
      if (itemData) {
        // Filter only parties with pending sell data (after loading)
        const sellParties = (itemData.party_breakdown || []).filter(
          (party: PartyBreakdown) => party.pending_sell_packs > 0
        );
        setPartyBreakdown(sellParties);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load sell parties data');
      console.error('Sell parties error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const generatePDF = async () => {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Sell Parties Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .subtitle { font-size: 16px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: center; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .total-row { background-color: #f9fafb; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Sell Parties Report</div>
            <div class="subtitle">${itemName} - ${exPlantName}</div>
            <div class="subtitle">Generated on: ${new Date().toLocaleDateString()}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Sr No.</th>
                <th>Party Name</th>
                <th>Sell Packs</th>
              </tr>
            </thead>
            <tbody>
              ${partyBreakdown.map((party, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${party.party_name}</td>
                  <td>${formatNumber(party.pending_sell_packs)} MT</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2">Total</td>
                <td>${formatNumber(partyBreakdown.reduce((sum, party) => sum + party.pending_sell_packs, 0))} MT</td>
              </tr>
            </tbody>
          </table>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export Sell Parties Report',
        });
      } else {
        Alert.alert('Success', 'PDF generated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
      console.error('PDF generation error:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading sell parties...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>
            Sell Parties - {itemName} - {exPlantName}
          </Text>
          <TouchableOpacity 
            onPress={generatePDF} 
            style={styles.exportButton}
          >
            <Ionicons name="download" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>



        {/* Party List */}
        <View style={styles.partySection}>
          <Text style={styles.sectionTitle}>Sell Parties</Text>
          
          {partyBreakdown.length === 0 ? (
            <Card>
              <View style={styles.emptyContent}>
                <Ionicons name="trending-down" size={48} color="#6B7280" />
                <Text style={styles.emptyText}>No sell parties found</Text>
              </View>
            </Card>
          ) : (
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={styles.headerCell}>Sr No.</Text>
                <Text style={styles.headerCell}>Party Name</Text>
                <Text style={styles.headerCell}>Sell Packs</Text>
              </View>
              
              {/* Table Rows */}
              {partyBreakdown.map((party, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.cell}>{index + 1}</Text>
                  <Text style={styles.cell}>{party.party_name}</Text>
                  <Text style={styles.cell}>{formatNumber(party.pending_sell_packs)} MT</Text>
                </View>
              ))}
            </View>
          )}
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
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  exportButton: {
    marginLeft: 16,
  },

  partySection: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerCell: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cell: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
}); 