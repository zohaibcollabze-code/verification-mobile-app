import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/constants/colors';

interface MockGPSBannerProps {
    visible: boolean;
    rawCoordinates?: {
        latitude: number;
        longitude: number;
    };
}

export function MockGPSBanner({ visible, rawCoordinates }: MockGPSBannerProps) {
    const Colors = useColors();
    if (!visible) return null;

    return (
        <View style={[styles.banner, { backgroundColor: Colors.warning, borderBottomColor: Colors.warning }]}>
            <Text style={styles.text}>⚠ DEV MODE: Using mock Karachi coordinates.</Text>
            {rawCoordinates && (
                <Text style={styles.subText}>Device reported: {rawCoordinates.latitude.toFixed(4)}, {rawCoordinates.longitude.toFixed(4)} (Outside Pakistan)</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
    },
    text: {
        color: '#000',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    subText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
        opacity: 0.8,
    },
});
