import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Link,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { onAuthStateChanged } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytesResumable } from "firebase/storage";
import { auth, functions, storage } from "../../../firebase";
import { APP_PAGE_CONTENT_MAX_WIDTH } from "../../constants/site";

const SUPPORT_EMAIL = "support@sendquote.ai";
const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const Section = ({ title, subtitle, children }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="h6" fontWeight={700} color="#083a6b" sx={{ mb: 0.5 }}>
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {subtitle}
      </Typography>
    )}
    {children}
  </Box>
);

const Support = () => {
  const [userEmail, setUserEmail] = useState("");
  const [uid, setUid] = useState(null);

  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null); // 0–100 or null
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email ?? "");
        setUid(user.uid);
      }
    });
    return unsub;
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError("");

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError("Only PNG, JPG, WebP or GIF screenshots are accepted.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    setFileError("");
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadScreenshot = (file, reportId) =>
    new Promise((resolve, reject) => {
      const ext = file.name.split(".").pop() || "png";
      const storagePath = `bug_reports/${reportId}/screenshot.${ext}`;
      const storageRef = ref(storage, storagePath);
      const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

      task.on(
        "state_changed",
        (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        reject,
        // Resolve with the storage path - the Cloud Function uses the Admin SDK
        // to generate a signed URL, so we never need getDownloadURL on the client.
        () => resolve({ storagePath, name: file.name }),
      );
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      setError("Please describe the issue before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      // Use a temp doc ID so we can name the Storage path before the Firestore
      // write. The Cloud Function returns the real ID after it creates the doc.
      const safeEmail = userEmail.replace(/@/g, "_at_").replace(/\./g, "_");
      const tempId = `tmp_${safeEmail}_${Date.now()}`;

      let screenshotPath = null;
      let screenshotName = null;

      if (screenshot) {
        const result = await uploadScreenshot(screenshot, tempId);
        screenshotPath = result.storagePath;
        screenshotName = result.name;
      }

      const fn = httpsCallable(functions, "submitBugReport");
      await fn({ description: trimmedDesc, screenshotPath, screenshotName });

      setSubmitted(true);
    } catch (err) {
      console.error("Bug report submission failed", err);
      setError(
        err?.message?.includes("unauthenticated")
          ? "You must be signed in to submit a bug report."
          : "Something went wrong. Please email us directly at " + SUPPORT_EMAIL,
      );
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleReset = () => {
    setDescription("");
    handleRemoveScreenshot();
    setSubmitted(false);
    setError("");
  };

  const uploadLabel =
    uploadProgress !== null && uploadProgress < 100
      ? `Uploading screenshot… ${uploadProgress}%`
      : submitting
        ? "Submitting…"
        : null;

  return (
    <Box sx={{ maxWidth: APP_PAGE_CONTENT_MAX_WIDTH, mx: "auto" }}>
      <Typography variant="h5" fontWeight={800} color="#083a6b" sx={{ mb: 0.5 }}>
        Support
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Get help, report a bug, or send us a message.
      </Typography>

      {/* ── Contact us ── */}
      <Section
        title="Contact us"
        subtitle="Have a question or need a hand? Drop us an email and we'll get back to you within one business day."
      >
        <Box
          sx={{
            border: "1px solid #E5E7EB",
            borderRadius: 2,
            bgcolor: "#F8FAFC",
            px: 2.5,
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <EmailOutlinedIcon sx={{ color: "#083a6b", fontSize: 22 }} />
            <Box>
              <Typography variant="body2" fontWeight={600} color="#083a6b">
                Email support
              </Typography>
              <Link
                href={`mailto:${SUPPORT_EMAIL}`}
                underline="hover"
                variant="body2"
                sx={{ color: "#6B7280" }}
              >
                {SUPPORT_EMAIL}
              </Link>
            </Box>
          </Stack>
          <Button
            variant="outlined"
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("SendQuote support request")}&body=${encodeURIComponent(`Hi,\n\nMy account email is: ${userEmail}\n\n`)}`}
            size="small"
            startIcon={<EmailOutlinedIcon sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderColor: "#083a6b",
              color: "#083a6b",
              "&:hover": { borderColor: "#062d52", bgcolor: "rgba(8,58,107,0.04)" },
            }}
          >
            Send email
          </Button>
        </Box>
      </Section>

      <Divider sx={{ mb: 4 }} />

      {/* ── Bug report ── */}
      <Section
        title="Report a bug"
        subtitle="Something not working as expected? Tell us what happened and attach a screenshot if you can."
      >
        {submitted ? (
          <Box
            sx={{
              border: "1px solid #D1FAE5",
              borderRadius: 2,
              bgcolor: "#F0FDF4",
              px: 3,
              py: 3,
              textAlign: "center",
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 44, color: "#10A86B", mb: 1 }} />
            <Typography variant="h6" fontWeight={700} color="#083a6b" sx={{ mb: 0.5 }}>
              Report received - thank you!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              We&apos;ve got your report and will look into it. We&apos;ll follow up at{" "}
              <strong>{userEmail}</strong> if we need more information.
            </Typography>
            <Button
              variant="outlined"
              onClick={handleReset}
              size="small"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderColor: "#083a6b",
                color: "#083a6b",
                "&:hover": { borderColor: "#062d52", bgcolor: "rgba(8,58,107,0.04)" },
              }}
            >
              Report another issue
            </Button>
          </Box>
        ) : (
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ border: "1px solid #E5E7EB", borderRadius: 2, bgcolor: "#F8FAFC", p: 3 }}
          >
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
                {error}
              </Alert>
            )}

            <TextField
              label="Describe the issue"
              multiline
              minRows={4}
              maxRows={10}
              fullWidth
              required
              value={description}
              onChange={(e) => { setDescription(e.target.value); if (error) setError(""); }}
              placeholder="What were you doing? What did you expect to happen? What happened instead?"
              sx={{ mb: 2, bgcolor: "#fff" }}
              disabled={submitting}
            />

            {/* Screenshot upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {screenshotPreview ? (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                  Screenshot attached
                </Typography>
                <Box sx={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
                  <Box
                    component="img"
                    src={screenshotPreview}
                    alt="Screenshot preview"
                    sx={{
                      maxWidth: "100%",
                      maxHeight: 200,
                      borderRadius: 1.5,
                      border: "1px solid #E5E7EB",
                      display: "block",
                    }}
                  />
                  {!submitting && (
                    <IconButton
                      size="small"
                      onClick={handleRemoveScreenshot}
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        bgcolor: "rgba(0,0,0,0.55)",
                        color: "#fff",
                        borderRadius: "50%",
                        width: 24,
                        height: 24,
                        "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
                        p: 0,
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  {screenshot?.name}
                </Typography>
              </Box>
            ) : (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AttachFileIcon sx={{ fontSize: 16 }} />}
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                sx={{
                  mb: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  borderColor: "#D1D5DB",
                  color: "#374151",
                  "&:hover": { borderColor: "#083a6b", color: "#083a6b", bgcolor: "rgba(8,58,107,0.04)" },
                }}
              >
                Attach screenshot
              </Button>
            )}

            {fileError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFileError("")}>
                {fileError}
              </Alert>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              Max file size: {MAX_FILE_SIZE_MB} MB · Accepted: PNG, JPG, WebP, GIF
            </Typography>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                type="submit"
                variant="contained"
                disabled={submitting || !description.trim()}
                startIcon={submitting ? null : <BugReportOutlinedIcon sx={{ fontSize: 18 }} />}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  bgcolor: "#083a6b",
                  "&:hover": { bgcolor: "#062d52" },
                  "&:disabled": { bgcolor: "#E5E7EB", color: "#9CA3AF" },
                  minWidth: 180,
                }}
              >
                {submitting ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={16} sx={{ color: "#fff" }} />
                    <span>{uploadLabel ?? "Submitting…"}</span>
                  </Stack>
                ) : "Submit bug report"}
              </Button>
            </Stack>
          </Box>
        )}
      </Section>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Support;
