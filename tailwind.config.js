/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./App.{js,jsx,ts,tsx}",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                navy: {
                    DEFAULT: '#0B1221',
                    mid: '#161F30',
                    light: '#1E293B',
                },
                primary: {
                    DEFAULT: '#2463EB',
                    accent: '#3B82F6',
                },
                success: '#10B981',
                warning: '#F59E0B',
                danger: '#EF4444',
                neutral: '#D1D5DB',
                purple: '#7C3AED',
                text: {
                    DEFAULT: '#111827',
                    mid: '#374151',
                    light: '#6B7280',
                    muted: '#9CA3AF',
                },
                surface: '#FFFFFF',
                bg: { DEFAULT: '#F9FAFB', light: '#F3F4F6' },
                border: '#E5E7EB',
                'ice-blue': '#BFDBFE',
                'blue-soft': '#DBEAFE',
                'blue-pale': '#EFF6FF',
                'success-soft': '#D1FAE5',
                'warning-soft': '#FEF3C7',
                'danger-soft': '#FEE2E2',
                'purple-soft': '#EDE9FE',
            },
            fontFamily: {
                inter: ['Inter', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                'card': '16px',
                'button': '12px',
                'input': '10px',
                'badge': '20px',
            },
        },
    },
    plugins: [],
};
