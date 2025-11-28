import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import useStore from "../store";
import {
  BlockType,
  getBlockTimingSummary,
  getSessionTotalDuration,
  formatTime,
  getBlockTypeColor,
} from "../types";
import { useTheme } from "../theme";

export default function SessionPreviewScreen({ navigation, route }) {
  const { sessionId } = route.params || {};
  const colors = useTheme();
  const sessionTemplates = useStore((state) => state.sessionTemplates);
  const deleteSessionTemplate = useStore(
    (state) => state.deleteSessionTemplate
  );
  const session = sessionTemplates.find((s) => s.id === sessionId);
  const [expandedIds, setExpandedIds] = useState([]);
  const styles = getStyles(colors);

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Session not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalDuration = getSessionTotalDuration(session);

  const typeLabels = {
    [BlockType.ACTIVITY]: "Activity",
    [BlockType.REST]: "Rest",
    [BlockType.TRANSITION]: "Transition",
  };

  const toggleBlockDetails = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleOpenUrl = async (url) => {
    if (!url) return;
    let finalUrl = url.trim();

    // Add https:// if missing a scheme
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = "https://" + finalUrl;
    }

    try {
      const supported = await Linking.canOpenURL(finalUrl);
      if (supported) {
        await Linking.openURL(finalUrl);
      } else {
        Alert.alert("Cannot open link", finalUrl);
      }
    } catch (err) {
      Alert.alert("Error", "Unable to open link.");
      console.error(err);
    }
  };

  const renderBlockItem = ({ item, index }) => {
    const blockTypeColor = getBlockTypeColor(item.type, colors);
    const isExpanded = expandedIds.includes(item.id);
    const hasDetails = !!item.notes || !!item.url;

    return (
      <View
        style={[
          styles.blockItem,
          { borderLeftWidth: 4, borderLeftColor: blockTypeColor },
        ]}
      >
        <View style={[styles.blockIndex, { backgroundColor: blockTypeColor }]}>
          <Text style={styles.blockIndexText}>{index + 1}</Text>
        </View>

        <View style={styles.blockContent}>
          <Text style={styles.blockLabel}>{item.label}</Text>

          <View style={styles.blockMeta}>
            <Text style={[styles.blockType, { color: blockTypeColor }]}>
              {typeLabels[item.type] || item.type}
            </Text>
            <Text style={styles.blockTiming}>
              {getBlockTimingSummary(item)}
            </Text>
          </View>

          {hasDetails && (
            <>
              <TouchableOpacity
                style={styles.detailsToggle}
                onPress={() => toggleBlockDetails(item.id)}
              >
                <Text style={styles.detailsToggleText}>
                  {isExpanded ? "Hide details" : "View details"}
                </Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.blockDetails}>
                  {item.notes ? (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailsLabel}>Notes</Text>
                      <Text style={styles.detailsText}>{item.notes}</Text>
                    </View>
                  ) : null}

                  {item.url ? (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailsLabel}>Link</Text>
                      <TouchableOpacity
                        onPress={() => handleOpenUrl(item.url)}
                        style={styles.detailsLinkButton}
                      >
                        <Text style={styles.detailsLinkText}>Open link</Text>
                        <Text style={styles.detailsLinkUrl} numberOfLines={1}>
                          {item.url}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.sessionName}>{session.name}</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Duration</Text>
              <Text style={styles.summaryValue}>
                {formatTime(totalDuration)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Blocks</Text>
              <Text style={styles.summaryValue}>
                {session.items?.length || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Blocks List */}
        <View style={styles.blocksSection}>
          <Text style={styles.sectionTitle}>Session Blocks</Text>
          {!session.items || session.items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No blocks in this session</Text>
            </View>
          ) : (
            <FlatList
              data={session.items}
              renderItem={renderBlockItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.backButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.actionButtonText, styles.backButtonText]}>
            Back
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate("SessionBuilder", { sessionId })}
        >
          <Text style={[styles.actionButtonText, styles.editButtonText]}>
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => {
            Alert.alert(
              "Delete Session",
              `Are you sure you want to delete "${session.name}"?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    await deleteSessionTemplate(sessionId);
                    navigation.goBack();
                  },
                },
              ]
            );
          }}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
            Delete
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.playButton]}
          onPress={() =>
            navigation.navigate("RunSession", {
              sessionId,
              returnTo: { screen: "SessionPreview", params: { sessionId } },
            })
          }
          disabled={!session.items || session.items.length === 0}
        >
          <Text
            style={[
              styles.actionButtonText,
              styles.playButtonText,
              (!session.items || session.items.length === 0) &&
                styles.actionButtonTextDisabled,
            ]}
          >
            ▶ Start
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    header: {
      backgroundColor: colors.cardBackground,
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    sessionName: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 16,
    },
    summaryContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    summaryItem: {
      alignItems: "center",
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.primary,
    },
    blocksSection: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    blockItem: {
      flexDirection: "row",
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      padding: 16,
      paddingLeft: 12, // Account for border
      marginBottom: 12,
      alignItems: "flex-start",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    blockIndex: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    blockIndexText: {
      color: colors.textLight,
      fontSize: 14,
      fontWeight: "600",
    },
    blockContent: {
      flex: 1,
    },
    blockLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    blockMeta: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 4,
    },
    blockType: {
      fontSize: 14,
      color: colors.textSecondary,
      textTransform: "capitalize",
    },
    blockTiming: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "500",
    },
    detailsToggle: {
      marginTop: 6,
    },
    detailsToggleText: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: "500",
    },
    blockDetails: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      gap: 6,
    },
    detailSection: {
      marginBottom: 4,
    },
    detailsLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 2,
      textTransform: "uppercase",
    },
    detailsText: {
      fontSize: 14,
      color: colors.text,
    },
    detailsLinkButton: {
      paddingVertical: 6,
    },
    detailsLinkText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "600",
    },
    detailsLinkUrl: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    emptyContainer: {
      padding: 40,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 16,
      color: colors.textTertiary,
    },
    actions: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      padding: 16,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      gap: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: "center",
    },
    backButton: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    backButtonText: {
      color: colors.textSecondary,
    },
    editButton: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    editButtonText: {
      color: colors.primary,
    },
    deleteButton: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.error,
    },
    deleteButtonText: {
      color: colors.error,
    },
    playButton: {
      backgroundColor: colors.primary,
    },
    playButtonText: {
      color: colors.textLight,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: "600",
    },
    actionButtonTextDisabled: {
      opacity: 0.5,
    },
    errorText: {
      fontSize: 18,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 20,
    },
  });
