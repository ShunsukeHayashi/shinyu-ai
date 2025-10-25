import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // IVE-inspired elegant palette
        background: '#0A0A0F',        // Deep midnight blue-black
        surface: '#1A1A28',           // Soft purple-tinted dark
        'surface-elevated': '#252535', // Elevated purple-gray
        accent: '#C084FC',            // Soft purple (IVE signature)
        'accent-secondary': '#A78BFA', // Lighter purple
        'accent-glow': '#DDD6FE',     // Pale lavender glow
        border: 'rgba(192, 132, 252, 0.15)', // Purple-tinted border
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      fontSize: {
        'display': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
        'title-1': ['28px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'title-2': ['22px', { lineHeight: '1.3', fontWeight: '500' }],
        'body': ['17px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['13px', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '400' }],
      },
      spacing: {
        'xs': '8px',
        'sm': '16px',
        'md': '24px',
        'lg': '32px',
        'xl': '48px',
        '2xl': '64px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
