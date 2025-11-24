import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import useStore from '../store';

export default function GoProScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);
  const styles = getStyles(colors);

  const handlePurchase = (type) => {
    // Dummy handler - will be replaced with real purchase logic
    Alert.alert(
      'Purchase',
      `This would initiate a ${type} purchase. Purchase functionality will be implemented later.`,
      [{ text: 'OK' }]
    );
  };

  const handleRestorePurchases = () => {
    // Dummy handler - will be replaced with real restore logic
    Alert.alert(
      'Restore Purchases',
      'This would restore your previous purchases. Restore functionality will be implemented later.',
      [{ text: 'OK' }]
    );
  };

  const proFeatures = [
    'Unlimited sessions',
    'Unlimited activities',
    'Custom categories',
    'Full history retention',
    'Export sessions',
    'All future Pro features',
  ];

  const freeFeatures = [
    'Up to 5 sessions',
    'Up to 20 activities',
    'Built-in categories only',
    '30 days history',
    'Import sessions',
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Timer Pro</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.proBadge}>
            <Ionicons name="star" size={32} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Unlock Timer Pro</Text>
          <Text style={styles.heroSubtitle}>
            Get unlimited sessions, activities, custom categories, and more
          </Text>
        </View>

        {/* Comparison Table */}
        <View style={styles.comparisonSection}>
          <Text style={styles.sectionTitle}>Free vs Pro</Text>
          
          <View style={styles.comparisonTable}>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Sessions</Text>
              <Text style={styles.comparisonFree}>5 max</Text>
              <Text style={styles.comparisonPro}>Unlimited</Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Activities</Text>
              <Text style={styles.comparisonFree}>20 max</Text>
              <Text style={styles.comparisonPro}>Unlimited</Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Categories</Text>
              <Text style={styles.comparisonFree}>Built-in only</Text>
              <Text style={styles.comparisonPro}>Custom + Built-in</Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>History</Text>
              <Text style={styles.comparisonFree}>30 days</Text>
              <Text style={styles.comparisonPro}>Unlimited</Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Export</Text>
              <Text style={styles.comparisonFree}>❌</Text>
              <Text style={styles.comparisonPro}>✅</Text>
            </View>
          </View>
        </View>

        {/* Features List */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Pro Features</Text>
          {proFeatures.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Pricing Options */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          
          <TouchableOpacity
            style={[styles.pricingOption, styles.pricingOptionRecommended]}
            onPress={() => handlePurchase('yearly')}
          >
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingTitle}>Yearly</Text>
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>Recommended</Text>
              </View>
            </View>
            <Text style={styles.pricingPrice}>$9.99</Text>
            <Text style={styles.pricingPeriod}>per year</Text>
            <Text style={styles.pricingSavings}>Save 17% vs monthly</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pricingOption}
            onPress={() => handlePurchase('monthly')}
          >
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingTitle}>Monthly</Text>
            </View>
            <Text style={styles.pricingPrice}>$0.99</Text>
            <Text style={styles.pricingPeriod}>per month</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pricingOption}
            onPress={() => handlePurchase('lifetime')}
          >
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingTitle}>Lifetime</Text>
            </View>
            <Text style={styles.pricingPrice}>$14.99</Text>
            <Text style={styles.pricingPeriod}>one-time purchase</Text>
            <Text style={styles.pricingSavings}>All current & future features</Text>
          </TouchableOpacity>
        </View>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.cardBackground,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  proBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  comparisonSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  comparisonTable: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  comparisonRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  comparisonLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  comparisonFree: {
    flex: 1,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  comparisonPro: {
    flex: 1,
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  featuresSection: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 4,
  },
  featureText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  pricingSection: {
    marginBottom: 24,
  },
  pricingOption: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  pricingOptionRecommended: {
    borderColor: colors.primary,
    backgroundColor: colors.purpleLight,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  recommendedBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
  },
  pricingPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  pricingPeriod: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  pricingSavings: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 4,
  },
  restoreButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
});

