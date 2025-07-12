import { createTheme } from "@mui/material/styles";

// Global overrides to Material UI styles
const theme = createTheme({
  palette: {
    primary: {
      main: "#083a6b",
    },
    secondary: {
      main: "#e0ecff",
    },
  },
  typography: {
    fontFamily: "Manrope, system-ui, Avenir, Helvetica, Arial, sans-serif",
    button: {
      textTransform: "none",
    },
    h1: { color: "#083a6b" },
    h2: { color: "#083a6b" },
    h3: { color: "#083a6b" },
    h4: { color: "#083a6b" },
    h5: { color: "#083a6b" },
    h6: { color: "#083a6b" },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        h4: {
          color: "#083a6b",
        },
        h6: {
          color: "#083a6b",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          backgroundColor: "#083a6b",
          borderRadius: "8px",
          color: "#fff",
          textTransform: "none",
          boxShadow: "none",
          "&:hover": {
            backgroundColor: "#0d3a66",
            boxShadow: "none",
          },
        },
        outlinedPrimary: {
          borderColor: "#1976d2",
          color: "#1976d2",
          textTransform: "none",
          boxShadow: "none",
          "&:hover": {
            borderColor: "#083a6b",
            backgroundColor: "rgba(17, 82, 147, 0.1)",
            boxShadow: "none",
          },
        },
        containedSecondary: {
          backgroundColor: "#e0ecff",
          color: "#083a6b",
          textTransform: "none",
          boxShadow: "none",
          "&:hover": {
            backgroundColor: "#b3d1ff",
            boxShadow: "none",
          },
        },
        outlinedSecondary: {
          borderColor: "#e0ecff",
          color: "#083a6b",
          textTransform: "none",
          boxShadow: "none",
          "&:hover": {
            borderColor: "#b3d1ff",
            backgroundColor: "rgba(224, 236, 255, 0.5)",
            boxShadow: "none",
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        asterisk: {
          display: "none",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: "#fff",
          borderRadius: "8px",
        },
        input: {
          background: "#fff",
          borderRadius: "8px",
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          color: "#111827",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          position: "static",
        },
      },
    },
  },
});

export default theme;
