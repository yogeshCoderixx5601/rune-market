const customColors = {
  primary: {
    DEFAULT: "#04020e",
    dark: "#1f1d3e",
  },
  secondary: {
    DEFAULT: "#0A041D",
    dark: "#a8a4a4",
  },
  accent: {
    DEFAULT: "#9102F0",
  },
  accent_primary: {
    DEFAULT: "#9C23ED",
  },
  accent_secondary: {
    DEFAULT: "#7600C5",
  },
  accent_dark: "#3d0263",
  gray:"#8e8e8e",
  light_gray: "#cbd5e0",
  dark_gray:"#39092b",
  customPurple_800: '#942073',
  customPurple_900: '#7c1f61',
  customPurple_950:"#39092b",
  border:"#595b83",
  black: "#0c0d0c",
  bitcoin: "#eab308",
  violet: "#0B071E",
  dark_violet_700: "#0c082a",
  dark_violet_600: "#161232",
  bitcoin_orange: "#FFA800",
  bitcoin_apes_bg: " #3A3C41",
  custom_bg: "#FFFFFF14",
  mint_bg: "#04020E",
  gradient_bg_second: "#53018A",
  bg_gradient_1: "#181621",
  bg_gradient_2: "#110F18",
  green: "#85FF3A",
  mint_blur_bg: "#ffffff1a",
};

module.exports = {
  mode: "jit",
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: false,
  theme: {
    fontFamily: {
      sans: ['"Facebook Sans"', "sans-serif"], //
    },
    extend: {
      colors: customColors,
      height: {
        "vh-10": "10vh",
        "vh-20": "20vh",
        "vh-30": "30vh",
        "vh-40": "40vh",
        "vh-50": "50vh",
        "vh-60": "60vh",
        "vh-70": "70vh",
        "vh-80": "80vh",
        "vh-90": "90vh",
        "vh-100": "100vh",
        "vh-110": "110vh",
        "vh-120": "120vh",
        "vh-130": "130vh",
        "vh-140": "140vh",
        "vh-150": "150vh",
        "vh-175": "175vh",
      },
      screens: {
        "3xl": "2048px",
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
