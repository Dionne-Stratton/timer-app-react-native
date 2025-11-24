import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export default function ProUpgradeModal({ visible, onClose, limitType, onUpgrade }) {
  const colors = useTheme();
  const styles = getStyles(colors);

  const getLimitMessage = () => {
    switch (limitType) {
      case 'sessions':
        return {
          title: 'Session Limit Reached',
          message: 'Free plan allows up to 5 sessions.\nUpgrade to Pro for unlimited sessions.',
        };
      case 'activities':
        return {
          title: 'Activity Limit Reached',
          message: 'Free plan allows up to 20 saved activities.\nUpgrade to Pro for unlimited activities.',
        };
      case 'customCategory':
        return {
          title: 'Custom Categories (Pro)',
          message: 'Custom categories are a Pro feature.\nUpgrade to create unlimited custom categories.',
        };
      case 'export':
        return {
          title: 'Export Sessions (Pro)',
          message: 'Exporting sessions is a Pro feature.\nUpgrade to share your sessions with others.',
        };
      default:
        return {
          title: 'Upgrade to Pro',
          message: 'This feature requires Timer Pro.\nUpgrade to unlock all features.',
        };
    }
  };

  const handleUpgrade = () => {
    onClose();
    if (onUpgrade) {
      onUpgrade();
    }
  };

  const limitInfo = getLimitMessage();

  const proFeatures = [
    'Unlimited sessions',
    'Unlimited activities',
    'Custom categories',
    'Full history retention',
    'Export sessions',
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.proIconContainer}>
                <Ionicons name="star" size={40} color={colors.primary} />
              </View>
              <Text style={styles.title}>{limitInfo.title}</Text>
              <Text style={styles.message}>{limitInfo.message}</Text>
            </View>

            {/* Features */}
            <View style={styles.featuresSection}>
              <Text style={styles.featuresTitle}>Pro Features Include:</Text>
              {proFeatures.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {/* Pricing */}
            <View style={styles.pricingSection}>
              <Text style={styles.pricingTitle}>Starting at $0.99/month</Text>
              <Text style={styles.pricingSubtitle}>or $9.99/year (save 17%)</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={handleUpgrade}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  proIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresSection: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingLeft: 4,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 10,
  },
  pricingSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: colors.backgroundMedium,
    borderRadius: 8,
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  pricingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actions: {
    gap: 12,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textLight,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

