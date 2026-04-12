import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { Link as RouterLink, useLocation } from "react-router-dom";

const PublicNavbar = () => {
  const { pathname } = useLocation();
  const isLogin = pathname === "/login";

  return (
    <AppBar position="static" elevation={0} sx={{ backgroundColor: "#083a6b" }}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <RouterLink to="/" style={{ textDecoration: "none" }}>
          <Typography
            fontSize={18}
            fontWeight="bold"
            sx={{ display: "flex", alignItems: "center", color: "#fff" }}
          >
            <FontAwesomeIcon icon={faPaperPlane} style={{ marginRight: "8px" }} />
            SendQuote
          </Typography>
        </RouterLink>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {isLogin ? (
            <Button
              component={RouterLink}
              to="/register"
              variant="outlined"
              size="small"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                color: "#fff",
                borderColor: "rgba(255,255,255,0.6)",
                "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.08)" },
              }}
            >
              Create account
            </Button>
          ) : (
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              size="small"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                color: "#fff",
                borderColor: "rgba(255,255,255,0.6)",
                "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.08)" },
              }}
            >
              Log in
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default PublicNavbar;
