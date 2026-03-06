import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';

export default function SuccessScreen({ route, navigation }: { route: any; navigation: any }) {
  const reference = route.params?.reference || 'REF-UNKNOWN';
  const circleScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.spring(circleScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslate, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        })
      ])
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Animated Success Icon */}
      <Animated.View style={[styles.circle, { transform: [{ scale: circleScale }] }]}>
        <Animated.Text style={[styles.checkMark, { opacity: checkOpacity }]}>✓</Animated.Text>
      </Animated.View>

      <Animated.View style={[styles.content, { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] }]}>
        <Text style={styles.title}>Submission Successful</Text>
        <Text style={styles.desc}>
          The inspection report for #{reference} has been securely uploaded to the central registry.
        </Text>

        {/* Reference Number Card — Dark Pro Style */}
        <View style={styles.refCard}>
          <Text style={styles.refLabel}>REFERENCE ID</Text>
          <View style={styles.refRow}>
            <Text style={styles.refValue}>{reference}</Text>
          </View>
          <Text style={styles.refFooter}>Draft data has been cleared from local storage.</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <Button
            title="Return to Dashboard"
            onPress={() => navigation.replace('MainTabs')}
            style={styles.primaryBtn}
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgScreen,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  checkMark: {
    fontSize: 44,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  desc: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  refCard: {
    width: '100%',
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    alignItems: 'center',
    marginBottom: 60,
  },
  refLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  copyIcon: {
    fontSize: 20,
  },
  refFooter: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 16,
    fontWeight: '500',
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    width: '100%',
  },
  outlineBtn: {
    width: '100%',
    borderColor: Colors.borderDefault,
  },
});
