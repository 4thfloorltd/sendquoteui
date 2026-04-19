import { Link, useLocation } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import PublicNavbar from "../components/PublicNavbar";

/**
 * Catch-all 404 - rendered inside Layout (public or secured shell).
 */
export default function NotFound() {
  const { pathname } = useLocation();
  const isSecured = pathname.startsWith("/secured");
  const backTo = isSecured ? "/secured/quotes" : "/";
  const backLabel = isSecured ? "Back to quotes" : "Back to homepage";

  return (
    <>
      {!isSecured && <PublicNavbar />}
      <Box
        sx={{
          maxWidth: 520,
          mx: "auto",
          px: { xs: 2, sm: 4 },
          py: { xs: 6, md: isSecured ? 4 : 8 },
          textAlign: "center",
        }}
      >
        <Typography
          variant="h1"
          sx={{
            fontWeight: 800,
            color: "#083a6b",
            fontSize: { xs: "3.5rem", sm: "4.5rem" },
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            mb: 1,
          }}
        >
          404
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#374151", mb: 1.5 }}>
          Page not found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </Typography>
        <Button
          component={Link}
          to={backTo}
          variant="contained"
          size="large"
          sx={{
            mt: 3,
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            bgcolor: "#083a6b",
            "&:hover": { bgcolor: "#062d52" },
          }}
        >
          {backLabel}
        </Button>
      </Box>
    </>
  );
}
