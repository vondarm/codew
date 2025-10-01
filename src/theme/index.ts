import { createTheme, type PaletteColor, type PaletteColorOptions } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    accent: PaletteColor;
  }

  interface PaletteOptions {
    accent?: PaletteColorOptions;
  }
}

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#1976d2",
    },
    success: {
      main: "#2e7d32",
    },
    info: {
      main: "#0288d1",
    },
    secondary: {
      main: "#9c27b0",
    },
  },
  shape: {
    borderRadius: 4,
  },
  typography: {
    fontFamily: ["'Inter'", "'Roboto'", "system-ui", "-apple-system", "BlinkMacSystemFont"].join(
      ", ",
    ),
    h1: {
      fontSize: "2.75rem",
      fontWeight: 700,
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 600,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.7,
    },
  },
});

export default theme;
