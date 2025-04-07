import type { Config } from "tailwindcss";
import { tokyoNight } from './src/lib/themes'; // Assuming themes are defined here

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class', // Enable dark mode via class
  theme: {
    extend: {
      colors: {
        // Tokyo Night Storm (Dark Theme) - Primary Palette
        'tokyo-storm': {
          DEFAULT: tokyoNight.storm.bg, // Main background
          bg: tokyoNight.storm.bg,
          bg_highlight: tokyoNight.storm.bgHighlight,
          bg_sidebar: tokyoNight.storm.bgSidebar,
          bg_popup: tokyoNight.storm.bgPopup,
          bg_border: tokyoNight.storm.border,
          fg: tokyoNight.storm.fg, // Main foreground
          fg_deep: tokyoNight.storm.fgDeep,
          fg_gutter: tokyoNight.storm.fgGutter,
          comment: tokyoNight.storm.comment,
          red: tokyoNight.storm.red,
          orange: tokyoNight.storm.orange,
          yellow: tokyoNight.storm.yellow,
          green: tokyoNight.storm.green,
          blue: tokyoNight.storm.blue,
          blue_light: tokyoNight.storm.blueLight,
          magenta: tokyoNight.storm.magenta,
          magenta_light: tokyoNight.storm.magentaLight,
          black: tokyoNight.storm.black,
          terminal_black: tokyoNight.storm.terminalBlack,
          error: tokyoNight.storm.error,
          warning: tokyoNight.storm.warning,
          info: tokyoNight.storm.info,
          hint: tokyoNight.storm.hint,
          debug: tokyoNight.storm.debug,
          none: tokyoNight.storm.none, // Assuming 'none' is a valid key/color
        },
        // Basic Light Theme - Placeholder Palette
        'light-theme': {
          DEFAULT: '#FFFFFF', // White background
          bg: '#FFFFFF',
          bg_highlight: '#F0F0F0', // Light grey highlight
          fg: '#1F2937',       // Dark grey text
          primary: '#3B82F6', // Blue primary
          secondary: '#6B7280', // Grey secondary text
          border: '#D1D5DB',  // Grey border
          // Add more colors as needed (success, error, warning etc.)
          success: '#10B981',
          error: '#EF4444',
          warning: '#F59E0B',
        }
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
