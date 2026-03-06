/**
 * MPVP — API Error Boundary
 * Catches unhandled errors in child components and shows a recoverable
 * fallback screen instead of crashing the app.
 * API-aware: displays error codes and messages from ApiError instances.
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { ApiError } from '@/utils/exceptions';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export default class ApiErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        if (__DEV__) {
            console.error('[ApiErrorBoundary] Caught error:', error, errorInfo);
        }
        // Production: send to crash analytics
        // CrashAnalytics.recordError(error);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };

    public render() {
        if (this.state.hasError) {
            const error = this.state.error;
            const isApiError = error instanceof ApiError;
            const errorCode = isApiError ? (error as ApiError).code : undefined;
            const errorMessage = isApiError
                ? error.message
                : 'An unexpected error occurred. Please try again.';

            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <Text style={styles.iconText}>⚠️</Text>
                        </View>

                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.message}>{errorMessage}</Text>

                        {errorCode ? (
                            <View style={styles.codeContainer}>
                                <Text style={styles.codeLabel}>Error Code</Text>
                                <Text style={styles.codeValue}>{errorCode}</Text>
                            </View>
                        ) : null}

                        <Pressable
                            onPress={this.handleRetry}
                            style={({ pressed }) => [
                                styles.retryButton,
                                pressed && styles.retryPressed,
                            ]}
                        >
                            <Text style={styles.retryText}>Try Again</Text>
                        </Pressable>
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B1221',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    iconText: {
        fontSize: 40,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    codeContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        marginBottom: 32,
        alignItems: 'center',
    },
    codeLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    codeValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#EF4444',
        fontFamily: 'monospace',
    },
    retryButton: {
        backgroundColor: '#2563EB',
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        width: '100%',
    },
    retryPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
