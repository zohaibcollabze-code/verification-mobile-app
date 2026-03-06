import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, useColors } from '@/constants/colors';
import { Shadows } from '@/constants/shadows';
import { useInspectionStore } from '@/stores/inspectionStore';
import { GeometricIcon } from '@/components/ui/GeometricIcon';
import { jobsService } from '@/services/jobs/jobsService';
import { ErrorHandler } from '@/utils/errorHandler';
import { findingsService } from '@/services/findings/findingsService';

// Steps
import Step1ClientDetails from './Step1ClientDetails';
import Step3Findings from './Step3Findings';
import Step4Photos from './Step4Photos';
import ReviewScreen from './ReviewScreen';

const STEPS = [
  { id: 1, label: 'ASSET', name: 'Step1ClientDetails' },
  { id: 2, label: 'FINDINGS', name: 'Step3Findings' },
  { id: 3, label: 'MEDIA', name: 'Step4Photos' },
  { id: 4, label: 'REVIEW', name: 'ReviewScreen' },
];

export default function InspectionNavigator() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const colors = useColors();
  const requestId = route.params?.requestId;

  const StepIndicator = useCallback(({ currentStep }: { currentStep: number }) => {
    const stepStyles = useMemo(() => StyleSheet.create({
      indicatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 24,
        paddingBottom: 28,
        paddingHorizontal: 24,
      },
      stepWrapper: {
        alignItems: 'center',
        minWidth: 50,
      },
      dot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.dark900,
        borderWidth: 1,
        borderColor: colors.dark700,
        alignItems: 'center',
        justifyContent: 'center',
      },
      dotActive: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: colors.primary,
        borderWidth: 2,
      },
      dotCompleted: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
      },
      dotText: {
        color: colors.textMuted,
        fontSize: 11,
        fontWeight: '800',
      },
      dotTextActive: {
        color: colors.primary,
      },
      checkmark: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
      },
      stepLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textMuted,
        marginTop: 8,
        letterSpacing: 0.5,
      },
      stepLabelActive: {
        color: colors.primary,
      },
      connector: {
        flex: 1,
        height: 2,
        backgroundColor: colors.dark700,
        marginHorizontal: 8,
        marginTop: -20,
      },
      connectorCompleted: {
        backgroundColor: colors.primary,
      },
    }), [colors]);

    return (
      <View style={stepStyles.indicatorContainer}>
        {STEPS.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;

          return (
            <React.Fragment key={step.id}>
              <View style={stepStyles.stepWrapper}>
                <View
                  style={[
                    stepStyles.dot,
                    isActive && stepStyles.dotActive,
                    isCompleted && stepStyles.dotCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <Text style={stepStyles.checkmark}>✓</Text>
                  ) : (
                    <Text style={[stepStyles.dotText, isActive && stepStyles.dotTextActive]}>{step.id}</Text>
                  )}
                </View>
                <Text style={[stepStyles.stepLabel, isActive && stepStyles.stepLabelActive]}>
                  {step.label}
                </Text>
              </View>
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    stepStyles.connector,
                    isCompleted && stepStyles.connectorCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  }, [colors]);

  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.bgScreen,
    },
    header: {
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14, // Aligns back icon (14+10) with content (24)
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDefault,
      backgroundColor: colors.bgScreen,
    },
    backButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleContainer: {
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600',
      marginTop: 2,
    },
    saveButton: {
      paddingHorizontal: 16,
      height: 44,
      justifyContent: 'center',
    },
    saveText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
    content: {
      flex: 1,
    },
  }), [colors]);

  // Use Centralized Zustand Store
  const currentRequestId = useInspectionStore((s) => s.currentRequestId);
  const drafts = useInspectionStore((s) => s.drafts);
  const setCurrentRequestId = useInspectionStore((s) => s.setCurrentRequestId);

  // Local state for step navigation within the navigator
  const [activeStep, setActiveStep] = useState(1);

  const draft = drafts[requestId];
  const assignment = draft?.assignment;

  // Logic to ensure current ID is set and schema is fetched
  useEffect(() => {
    if (requestId && requestId !== currentRequestId) {
      setCurrentRequestId(requestId);
    }
  }, [requestId, currentRequestId, setCurrentRequestId]);

  useEffect(() => {
    async function fetchSchema() {
      // Guard: Only fetch if we don't have a snapshot AND the draft exists
      // We check for length === 0, but we also want to avoid a loop if the API returns []
      if (requestId && (!draft?.schemaSnapshot || draft.schemaSnapshot.length === 0)) {
        try {
          const schemaData = await jobsService.getFindingsSchema(requestId);
          // If we already have an empty array and the API also returns an empty array, 
          // do NOT update the store to avoid reference-change loops.
          const newSchema = schemaData?.findingsSchema || [];
          const currentSchema = draft?.schemaSnapshot || [];

          if (newSchema.length > 0 || currentSchema.length === 0) {
            // Only update if there's actual data to add OR we are initializing for the first time
            // To be even safer, we only update if they are actually different
            if (JSON.stringify(newSchema) !== JSON.stringify(currentSchema)) {
              useInspectionStore.getState().updateSchemaSnapshot(requestId, newSchema);
            }
          }
        } catch (err) {
          ErrorHandler.logError('Failed to load findings schema', err);
        }
      }
    }
    fetchSchema();
    // Using a more stable dependency: only re-run if requestId changes or if we explicitly need to check the snapshot
  }, [requestId, Boolean(draft?.schemaSnapshot?.length)]);

  // Load previous inspection data for returned tasks
  useEffect(() => {
    if (assignment?.status?.toLowerCase() === 'returned') {
      findingsService.getPreviousInspection(requestId).then(data => {
        if (data) {
          useInspectionStore.getState().updateFromPrevious(requestId, data);
        }
      });
    }
  }, [requestId, assignment]);

  // Handle Android hard-back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (activeStep > 1) {
          setActiveStep((s) => s - 1);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [activeStep])
  );

  const handleBack = () => {
    if (activeStep === 1) {
      navigation.goBack();
    } else {
      setActiveStep((s) => s - 1);
    }
  };

  const handleNext = () => {
    if (activeStep < STEPS.length) {
      setActiveStep((s) => s + 1);
    }
  };

  const renderCurrentScreen = () => {
    const props = {
      onNext: handleNext,
      onBack: handleBack,
      requestId,
      onGoToStep: (step: number) => setActiveStep(step)
    };
    switch (activeStep) {
      case 1: return <Step1ClientDetails {...props} />;
      case 2: return <Step3Findings {...props} />;
      case 3: return <Step4Photos {...props} />;
      case 4: return <ReviewScreen {...props} />;
      default: return <Step1ClientDetails {...props} />;
    }
  };

  if (!assignment) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={[styles.header, Shadows.sm]}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={20}>
          <GeometricIcon type="Back" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>New Inspection</Text>
          <Text style={styles.headerSubtitle}>ID: #{assignment?.referenceNumber || '---'}</Text>
        </View>
        <Pressable onPress={() => navigation.goBack()} style={styles.saveButton}>
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>

      <StepIndicator currentStep={activeStep} />

      <View style={styles.content}>
        {renderCurrentScreen()}
      </View>
    </SafeAreaView>
  );
}
