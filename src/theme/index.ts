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
    mode: "light",
    primary: {
      main: "#0051cb",
    },
    secondary: {
      main: "#ff6f61",
    },
    accent: {
      main: "#00a99d",
    },
    background: {
      default: "#f4f6fb",
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 12,
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
