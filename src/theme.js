import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#174082",
    },
    secondary: {
      main: "#e0ecff",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          backgroundColor: "#174082",
          color: "#fff",
          textTransform: "none",
          boxShadow: "none",
          "&:hover": {
            backgroundColor: "#115293",
            boxShadow: "none",
          },
        },
        outlinedPrimary: {
          borderColor: "#1976d2",
          color: "#1976d2",
          textTransform: "none",
          boxShadow: "none",
          "&:hover": {
            borderColor: "#115293",
            backgroundColor: "rgba(25, 118, 210, 0.1)",
            boxShadow: "none",
          },
        },
        containedSecondary: {
          backgroundColor: "#e0ecff",
          color: "#174082",
          textTransform: "none",
          boxShadow: "none",
          "&:hover": {
            backgroundColor: "#c2d6ff",
            boxShadow: "none",
          },
        },
        outlinedSecondary: {
          borderColor: "#e0ecff",
          color: "#174082",
          textTransform: "none",
          boxShadow: "none",
          "&:hover": {
            borderColor: "#c2d6ff",
            backgroundColor: "rgba(224, 236, 255, 0.5)",
            boxShadow: "none",
          },
        },
      },
    },
  },
});

export default theme;
