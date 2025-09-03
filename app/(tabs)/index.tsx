import { useState } from 'react';
import { StyleSheet, ScrollView, Button, Alert, Text, View, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

export default function FileSystemCopyBugDemo() {
  const [originalUri, setOriginalUri] = useState<string | null>(null);
  const [copiedUri, setCopiedUri] = useState<string | null>(null);
  const [copiedFromLocalUri, setCopiedFromLocalUri] = useState<string | null>(null);
  const [assetInfo, setAssetInfo] = useState<any>(null);

  const requestPermissions = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status === 'granted') {
        Alert.alert('Success', 'Permission granted!');
      } else {
        Alert.alert('Permission Issue', 'Please grant media library permission in Settings');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to get permissions: ${error}`);
    }
  };

  const selectFromMediaLibrary = async () => {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant media library permission');
        return;
      }

      // Get recent photos
      const assets = await MediaLibrary.getAssetsAsync({
        first: 20,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: MediaLibrary.SortBy.creationTime,
      });

      if (assets.assets.length === 0) {
        Alert.alert('No photos', 'No photos found in library');
        return;
      }

      // Use the most recent photo
      const recentAsset = assets.assets[0];
      console.log('Selected asset:', recentAsset);
      console.log('Asset URI:', recentAsset.uri);
      
      // Store the original URI for display
      setOriginalUri(recentAsset.uri);
      
      // Get full asset info to access localUri
      const fullAssetInfo = await MediaLibrary.getAssetInfoAsync(recentAsset.id);
      setAssetInfo(fullAssetInfo);
      console.log('Full asset info:', fullAssetInfo);
      console.log('LocalUri:', fullAssetInfo.localUri);
      
      // BUG: Copy ph:// URI loses iOS adjustments
      console.log('Copying ph:// URI to cache...');
      const copiedPath = FileSystem.cacheDirectory + 'copied_ph_' + Date.now() + '.jpg';
      await FileSystem.copyAsync({
        from: recentAsset.uri,
        to: copiedPath
      });
      console.log('Copied to:', copiedPath);
      setCopiedUri(copiedPath);
      
      // WORKAROUND: Copy from localUri preserves adjustments
      if (fullAssetInfo.localUri) {
        console.log('Copying localUri to cache...');
        const copiedFromLocalPath = FileSystem.cacheDirectory + 'copied_local_' + Date.now() + '.jpg';
        await FileSystem.copyAsync({
          from: fullAssetInfo.localUri,
          to: copiedFromLocalPath
        });
        console.log('Copied from localUri to:', copiedFromLocalPath);
        setCopiedFromLocalUri(copiedFromLocalPath);
      }
      
    } catch (error) {
      Alert.alert('Error', `Failed to select from library: ${error}`);
      console.error('Error:', error);
    }
  };

  const clearAll = () => {
    setOriginalUri(null);
    setCopiedUri(null);
    setCopiedFromLocalUri(null);
    setAssetInfo(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>iOS FileSystem.copyAsync Bug Demo</Text>
        <Text style={styles.subtitle}>
          FileSystem.copyAsync doesn't preserve iOS photo adjustments when copying ph:// URIs
        </Text>
        <Text style={styles.info}>Platform: {Platform.OS}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 1: Setup</Text>
        <Button title="Request Permissions" onPress={requestPermissions} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 2: Select Image</Text>
        <Text style={styles.instructions}>
          Before testing: Edit a photo in Snapseed and save "on top of" original
        </Text>
        <Button title="Select Most Recent Photo" onPress={selectFromMediaLibrary} />
      </View>

      {assetInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Asset Information</Text>
          <Text style={styles.code}>ph:// URI: {assetInfo.uri}</Text>
          <Text style={styles.code}>localUri: {assetInfo.localUri || 'Not available'}</Text>
          <Text style={styles.code}>Filename: {assetInfo.filename}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Results</Text>
        <Text style={styles.instructions}>
          Compare the images below to see the bug and workaround
        </Text>
      </View>

      {originalUri && (
        <View style={styles.imageSection}>
          <Text style={styles.imageLabel}>1. Original (ph:// URI displayed directly)</Text>
          <Text style={styles.successText}>✓ Shows edits correctly</Text>
          <Image source={{ uri: originalUri }} style={styles.image} contentFit="contain" />
          <Text style={styles.uriText}>{originalUri}</Text>
        </View>
      )}

      {copiedUri && (
        <View style={styles.imageSection}>
          <Text style={styles.imageLabel}>2. After FileSystem.copyAsync from ph://</Text>
          <Text style={styles.errorText}>✗ BUG: Edits are lost!</Text>
          <Image source={{ uri: copiedUri }} style={styles.image} contentFit="contain" />
          <Text style={styles.uriText}>{copiedUri}</Text>
        </View>
      )}

      {copiedFromLocalUri && (
        <View style={styles.imageSection}>
          <Text style={styles.imageLabel}>3. WORKAROUND: FileSystem.copyAsync from localUri</Text>
          <Text style={styles.successText}>✓ Edits preserved!</Text>
          <Image source={{ uri: copiedFromLocalUri }} style={styles.image} contentFit="contain" />
          <Text style={styles.uriText}>{copiedFromLocalUri}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Button title="Clear All" onPress={clearAll} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <Text style={styles.instructions}>
          Bug: FileSystem.copyAsync(ph://) loses iOS photo adjustments{'\n\n'}
          Workaround: Use MediaLibrary.getAssetInfoAsync() to get localUri, then copy from that instead
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  info: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  imageSection: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    backgroundColor: '#f0f0f0',
    marginBottom: 10,
  },
  uriText: {
    fontSize: 10,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  code: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#333',
    marginBottom: 4,
  },
});