import { Box, Paper, Typography } from "@mui/material";
import { APP_PAGE_CONTENT_MAX_WIDTH } from "../../constants/site";

export default function Invoices() {
  return (
    <Box sx={{ maxWidth: APP_PAGE_CONTENT_MAX_WIDTH, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} color="#083a6b" sx={{ mb: 0.5 }}>
        Invoices
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Create and manage invoices from your account.
      </Typography>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          border: "1px solid #E5E7EB",
          borderRadius: 2,
          bgcolor: "#fff",
          textAlign: "center",
        }}
      >
        <Typography color="text.secondary">
          Invoice tools are coming soon. You can keep sending quotes from the Quotes page.
        </Typography>
      </Paper>
    </Box>
  );
}
