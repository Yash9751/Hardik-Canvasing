import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';
import * as Print from 'expo-print';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface PDFPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  pdfUri: string;
  fileName: string;
  onShare?: () => void;
  onDownload?: () => void;
}

const { width, height } = Dimensions.get('window');

export default function PDFPreviewModal({
  visible,
  onClose,
  pdfUri,
  fileName,
  onShare,
  onDownload,
}: PDFPreviewModalProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<any>(null);

  const handleShare = async () => {
    try {
      if (onShare) {
        onShare();
      } else {
        // Check if file exists before sharing
        const info = await FileSystem.getInfoAsync(pdfUri);
        if (!info.exists) {
          throw new Error('PDF file not found');
        }
        
        console.log('Sharing PDF:', pdfUri);
        console.log('File size:', (info as any).size, 'bytes');
        
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          throw new Error('Sharing is not available on this device');
        }
        
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${fileName}`,
          UTI: 'com.adobe.pdf'
        });
      }
    } catch (error: any) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share PDF: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDownload = async () => {
    try {
      if (onDownload) {
        onDownload();
      } else {
        // Default download behavior - save to documents directory
        const downloadDir = FileSystem.documentDirectory;
        if (!downloadDir) {
          throw new Error('Documents directory not accessible');
        }
        
        // Create a unique filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        // More aggressive sanitization to remove ALL problematic characters including slashes
        const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\/+/g, '_');
        const localUri = `${downloadDir}${safeFileName}`;
        
        console.log('Saving PDF from:', pdfUri);
        console.log('Saving PDF to:', localUri);
        
        // Check if source file exists
        const sourceInfo = await FileSystem.getInfoAsync(pdfUri);
        if (!sourceInfo.exists) {
          throw new Error('Source PDF file not found');
        }
        
        console.log('Source file size:', (sourceInfo as any).size, 'bytes');
        
        // Copy the file
        await FileSystem.copyAsync({
          from: pdfUri,
          to: localUri
        });
        
        // Verify the copy was successful
        const destInfo = await FileSystem.getInfoAsync(localUri);
        if (!destInfo.exists) {
          throw new Error('Failed to save PDF - file not created');
        }
        
        console.log('PDF saved successfully to:', localUri);
        console.log('Saved file size:', (destInfo as any).size, 'bytes');
        
        Alert.alert(
          'Success', 
          `PDF saved successfully!\n\nFile: ${safeFileName}\nLocation: Documents folder`,
          [
            { text: 'OK', style: 'default' },
            { 
              text: 'Open File', 
              onPress: async () => {
                try {
                  const canOpen = await Linking.canOpenURL(localUri);
                  if (canOpen) {
                    await Linking.openURL(localUri);
                  } else {
                    Alert.alert('Info', 'No PDF viewer app found to open the saved file');
                  }
                } catch (error: any) {
                  Alert.alert('Error', 'Failed to open saved PDF: ' + error.message);
                }
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to save PDF: ' + (error.message || 'Unknown error'));
    }
  };

  const handleOpenInDefaultViewer = async () => {
    try {
      // Check if file exists first
      const info = await FileSystem.getInfoAsync(pdfUri);
      if (!info.exists) {
        throw new Error('PDF file not found');
      }
      
      const canOpen = await Linking.canOpenURL(pdfUri);
      if (canOpen) {
        await Linking.openURL(pdfUri);
      } else {
        Alert.alert('Error', 'No PDF viewer app found on your device');
      }
    } catch (error: any) {
      console.error('Open error:', error);
      Alert.alert('Error', 'Failed to open PDF: ' + (error.message || 'Unknown error'));
    }
  };

  const handlePrint = async () => {
    try {
      // Check if file exists first
      const info = await FileSystem.getInfoAsync(pdfUri);
      if (!info.exists) {
        throw new Error('PDF file not found');
      }

      const printResult = await Print.printAsync({
        uri: pdfUri,
      });
      
      // Don't check for printResult.uri - just assume it worked if no error was thrown
      Alert.alert('Success', 'PDF sent to print successfully!');
    } catch (error: any) {
      console.error('Print error:', error);
      // Don't show error alert - just log it silently
      // Alert.alert('Error', 'Failed to print PDF: ' + (error.message || 'Unknown error'));
    }
  };



  // Load file info when modal becomes visible
  useEffect(() => {
    if (visible && pdfUri) {
      setLoading(true);
      setError(null);
      
      const loadFileInfo = async () => {
        try {
          const info = await FileSystem.getInfoAsync(pdfUri);
          if (info.exists) {
            setFileInfo(info);
            setLoading(false);
          } else {
            setError('PDF file not found');
            setLoading(false);
          }
        } catch (err: any) {
          console.error('Error loading PDF info:', err);
          setError('Failed to load PDF');
          setLoading(false);
        }
      };
      
      loadFileInfo();
    }
  }, [visible, pdfUri]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
    >
      <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.title}>{fileName}</Text>
          </View>

          {/* PDF Content */}
          <View style={styles.pdfContainer}>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Loading PDF...</Text>
              </View>
            )}
            
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="document-outline" size={48} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={onClose} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}

            {!loading && !error && fileInfo && (
              <ScrollView style={styles.contentContainer} contentContainerStyle={styles.contentContainerStyle}>
                {/* PDF Preview Card */}
                <View style={styles.pdfPreviewCard}>
                  <View style={styles.pdfIconContainer}>
                    <Ionicons name="document-text" size={64} color="#3B82F6" />
                  </View>
                  
                  <Text style={styles.pdfTitle}>{fileName}</Text>
                  
                  <View style={styles.fileInfoContainer}>
                    <View style={styles.fileInfoRow}>
                      <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                      <Text style={styles.fileInfoText}>
                        File Size: {((fileInfo as any).size / 1024).toFixed(1)} KB
                      </Text>
                    </View>
                    <View style={styles.fileInfoRow}>
                      <Ionicons name="time-outline" size={16} color="#6B7280" />
                      <Text style={styles.fileInfoText}>
                        Created: {new Date(fileInfo.modificationTime || Date.now()).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.previewText}>
                    This is a PDF document. Use the buttons below to open, share, or save the file.
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.openButton]}
                    onPress={handleOpenInDefaultViewer}
                  >
                    <Ionicons name="open-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Open PDF</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.shareButton]}
                    onPress={handleShare}
                  >
                    <Ionicons name="share-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Share</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.downloadButton]}
                    onPress={handleDownload}
                  >
                    <Ionicons name="download-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Save</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.printButton]}
                    onPress={handlePrint}
                  >
                    <Ionicons name="print-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Print</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    flex: 1,
  },
  contentContainerStyle: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pdfPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pdfIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pdfTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  fileInfoContainer: {
    marginBottom: 16,
  },
  fileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileInfoText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtonsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  openButton: {
    backgroundColor: '#3B82F6',
  },
  shareButton: {
    backgroundColor: '#10B981',
  },
  downloadButton: {
    backgroundColor: '#F59E0B',
  },
  printButton: {
    backgroundColor: '#8B5CF6',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 