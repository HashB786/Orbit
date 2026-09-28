/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    50: 'rgb(var(--color-primary-50) / <alpha-value>)',
                    100: 'rgb(var(--color-primary-100) / <alpha-value>)',
                    200: 'rgb(var(--color-primary-200) / <alpha-value>)',
                    300: 'rgb(var(--color-primary-300) / <alpha-value>)',
                    400: 'rgb(var(--color-primary-400) / <alpha-value>)',
                    500: 'rgb(var(--color-primary-500) / <alpha-value>)',
                    600: 'rgb(var(--color-primary-600) / <alpha-value>)',
                    700: 'rgb(var(--color-primary-700) / <alpha-value>)',
                    800: 'rgb(var(--color-primary-800) / <alpha-value>)',
                    900: 'rgb(var(--color-primary-900) / <alpha-value>)',
                    950: 'rgb(var(--color-primary-950) / <alpha-value>)',
                },
                // Cool, space-tinted greys: every grey in the app leans toward deep indigo
                gray: {
                    50: '#f5f7ff',
                    100: '#eceffb',
                    200: '#dde2f4',
                    300: '#c2c9e4',
                    400: '#939cc0',
                    500: '#6b7497',
                    600: '#4f5777',
                    700: '#363e5e',
                    800: '#222a49',
                    900: '#131a36',
                    950: '#0a0f24',
                },
                dark: {
                    bg: '#050816', // deep space
                    card: '#090f27', // sidebar / nav
                    surface: '#0f1735' // cards
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'twinkle': 'twinkle 3.5s ease-in-out infinite',
                'spin-slow': 'spin 40s linear infinite',
                'spin-slower': 'spin 70s linear infinite',
                'spin-reverse': 'spin-reverse 55s linear infinite',
                'drift': 'drift 9s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-12px)' },
                },
                twinkle: {
                    '0%, 100%': { opacity: '0.25', transform: 'scale(0.8)' },
                    '50%': { opacity: '1', transform: 'scale(1)' },
                },
                'spin-reverse': {
                    from: { transform: 'rotate(360deg)' },
                    to: { transform: 'rotate(0deg)' },
                },
                drift: {
                    '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
                    '50%': { transform: 'translate(6px, -8px) rotate(4deg)' },
                }
            }
        },
    },
    plugins: [],
}
