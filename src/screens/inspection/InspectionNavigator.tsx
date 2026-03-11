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
import * as AssignmentCacheDB from '@/services/db/assignments';
import { useNetworkStore } from '@/stores/networkStore';
import { useAuthStore } from '@/stores/authStore';

// Steps
import Step3Findings from './Step3Findings';
import Step4Photos from './Step4Photos';
import ReviewScreen from './ReviewScreen';

const STEPS = [
  { id: 1, label: 'FINDINGS', name: 'Step3Findings' },
  { id: 2, label: 'MEDIA', name: 'Step4Photos' },
  { id: 3, label: 'REVIEW', name: 'ReviewScreen' },
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

  const activeInspection = useInspectionStore((s) => s.activeInspection);
  const assignment = useInspectionStore((s) => s.assignment);
  const initDraft = useInspectionStore((s) => s.initDraft);
  const getSchema = useInspectionStore((s) => s.getSchema);
  const isLoading = useInspectionStore((s) => s.isLoading);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const user = useAuthStore((s) => s.user);

  const [activeStep, setActiveStep] = useState(1);
  const [assignmentData, setAssignmentData] = useState<any>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInspection() {
      if (!requestId || !user) return;
      try {
        const cached = AssignmentCacheDB.getAssignment(requestId);
        let assignmentDetail = cached?.assignment;
        let schema: any[] = [];

        if (cached?.schemaSnapshot) {
          try {
            schema = JSON.parse(cached.schemaSnapshot);
          } catch {
            schema = [];
          }
        }

        if (isOnline) {
          try {
            assignmentDetail = await jobsService.getJobDetail(requestId);
            setAssignmentData(assignmentDetail);
            const schemaData = await jobsService.getFindingsSchema(requestId);
            schema = schemaData?.findingsSchema || [];
            AssignmentCacheDB.saveAssignment(assignmentDetail);
            AssignmentCacheDB.saveSchemaSnapshot(requestId, JSON.stringify(schema));
          } catch (err) {
            console.warn('[InspectionNavigator] Failed to fetch online data, using cache', err);
          }
        } else {
          setAssignmentData(assignmentDetail);
        }

        if (!schema || schema.length === 0) {
          setInitError('Schema not available. Please connect to the internet at least once.');
          return;
        }

        if (!assignmentDetail) {
          setInitError('Assignment data not available.');
          return;
        }

        await initDraft(requestId, user.id, schema, assignmentDetail);
      } catch (err) {
        ErrorHandler.logError('Failed to load inspection', err);
        setInitError('Failed to initialize inspection.');
      }
    }
    loadInspection();
  }, [requestId, user, isOnline]);


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
      case 1: return <Step3Findings {...props} />;
      case 2: return <Step4Photos {...props} />;
      case 3: return <ReviewScreen {...props} />;
      default: return <Step3Findings {...props} />;
    }
  };

  if (initError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, Shadows.sm]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={20}>
            <GeometricIcon type="Back" size={24} color={colors.primary} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Initialization Error</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: colors.textMuted, fontSize: 16, textAlign: 'center' }}>{initError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !assignment) return null;

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
