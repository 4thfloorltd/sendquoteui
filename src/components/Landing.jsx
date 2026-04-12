import React, { useState } from "react";
import {
  Box,
  Button,
  Grid,
  Link,
  TextField,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from "@mui/material";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faUser,
  faThumbsUp,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { AiPromptField } from "./AiPromptField";

const Landing = () => {
  const [projectMessage, setProjectMessage] = useState("");
  const navigate = useNavigate();

  const handleSendMessage = () => {
    const trimmedMessage = projectMessage.trim();
    if (!trimmedMessage) return;
    navigate("/quote", { state: { projectDescription: trimmedMessage } });
  };

  const scrollToPrompt = () => {
    const promptInput = document.getElementById("projectPromptInput");
    if (promptInput) {
      promptInput.focus();
      promptInput.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const scrollToFaq = () => {
    document.getElementById("landing-faq")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <Box>
      <Box
        sx={{
          background: "linear-gradient(to bottom, #a0c4ff, #fbfbff)",
          mb: 4,
        }}
      >
        <Box
          component="nav"
          aria-label="Primary"
          sx={{
            maxWidth: "1200px",
            margin: "0 auto",
            px: 2,
            pt: 2,
            pb: 1,
            minHeight: 52,
            display: "grid",
            alignItems: "center",
            columnGap: { xs: 1, md: 2 },
            // xs: logo | actions (no overlap). md+: spacer | centered logo | actions
            gridTemplateColumns: {
              xs: "minmax(0, 1fr) max-content",
              md: "minmax(0, 1fr) auto minmax(0, 1fr)",
            },
          }}
        >
          <Box
            aria-hidden
            sx={{ display: { xs: "none", md: "block" }, minWidth: 0 }}
          />
          <Link
            component={RouterLink}
            to="/"
            tabIndex={-1}
            underline="none"
            sx={{
              gridColumn: { xs: "1", md: "2" },
              justifySelf: { xs: "start", md: "center" },
              display: "flex",
              alignItems: "center",
              color: "#083a6b",
              minWidth: 0,
            }}
          >
            <Typography
              fontSize={{ xs: 22, sm: 28, md: 32 }}
              fontWeight="bold"
              sx={{
                display: "flex",
                alignItems: "center",
                color: "#083a6b",
                minWidth: 0,
              }}
            >
              <FontAwesomeIcon icon={faPaperPlane} style={{ marginRight: "8px", flexShrink: 0 }} />
              <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                SendQuote
              </Box>
            </Typography>
          </Link>
          <Box
            sx={{
              gridColumn: { xs: "2", md: "3" },
              justifySelf: "end",
              display: "flex",
              alignItems: "center",
              gap: { xs: 0.5, sm: 1.5 },
              flexShrink: 0,
            }}
          >
            <Button
              variant="text"
              onClick={scrollToFaq}
              aria-label="Scroll to frequently asked questions"
              sx={{
                color: "#083a6b",
                fontWeight: 600,
                fontSize: "0.9375rem",
                textTransform: "none",
                minWidth: "auto",
                px: 1,
              }}
            >
              FAQs
            </Button>
            <Button
              variant="contained"
              component={RouterLink}
              to="/login"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                bgcolor: "#083a6b",
                "&:hover": { bgcolor: "#062d52" },
              }}
            >
              Get started
            </Button>
          </Box>
        </Box>
        <Box
          className="flex flex-col md:flex-row items-start justify-center gap-5 px-4 pt-4"
          sx={{ maxWidth: "1200px", margin: "0 auto" }}
        >
          <Box className="flex-1 md:flex-1/2" width="100%">
            <Box justifySelf="center" maxWidth="900px">
              <Box textAlign="center" display="grid">
                <Typography
                  variant="h1"
                  className="animate-slideUp transition duration-500 delay-150"
                  fontSize={48}
                  fontWeight={900}
                  marginTop={{ xs: 2, sm: 4 }}
                  sx={{ color: "#083a6b" }}
                >
                  Simplify your{" "}
                  <span style={{ color: "#083a6b", fontWeight: "bold" }}>
                    quote
                  </span>{" "}
                  process
                </Typography>
              </Box>
              <Typography
                variant="body1"
                className="animate-slideUp transition duration-500 delay-200"
                sx={{
                  fontSize: "1.25rem",
                  fontWeight: "500",
                  ml: "auto",
                  mb: 6,
                  mr: "auto",
                  mt: 2,
                  textAlign: "center",
                  maxWidth: "600px",
                  color: "#083a6b",
                }}
              >
                Effortlessly create personalised, professional quotes for your
                customers and track their acceptance in real-time.
              </Typography>
            </Box>

            <Box
              id="project-chat-entry"
              sx={{
                width: "100%",
                maxWidth: "700px",
                mx: "auto",
                mb: "48px",
                border: "1px solid #D1D5DB",
                borderRadius: "18px",
                backgroundColor: "#fff",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
                p: "10px",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    width: "100%",
                    minWidth: 0,
                  }}
                >
                  <Box
                    sx={{
                      mt: 0.75,
                      color: "#083a6b",
                      backgroundColor: "#E0ECFF",
                      borderRadius: "999px",
                      width: 40,
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    aria-hidden
                  >
                    <AutoAwesome sx={{ fontSize: 22 }} />
                  </Box>
                  <AiPromptField
                    value={projectMessage}
                    onChange={setProjectMessage}
                    onSubmit={handleSendMessage}
                    variant="standard"
                    minRows={3}
                    maxRows={7}
                    id="projectPromptInput"
                    InputProps={{ disableUnderline: true }}
                    inputProps={{ "aria-label": "Describe your project or needs" }}
                    rootSx={{ flex: "1 1 0" }}
                    textFieldSx={(theme) => ({
                      width: "100%",
                      maxWidth: "100%",
                      "& .MuiInputBase-root": {
                        width: "100%",
                        maxWidth: "100%",
                        padding: 0,
                        backgroundColor: "transparent",
                      },
                      "& .MuiInputBase-input": {
                        width: "100%",
                        boxSizing: "border-box",
                        padding: theme.spacing(1),
                        fontFamily: theme.typography.fontFamily,
                        fontWeight: theme.typography.body1.fontWeight,
                        fontSize: theme.typography.body1.fontSize,
                        lineHeight: theme.typography.body1.lineHeight,
                        letterSpacing: theme.typography.body1.letterSpacing,
                        backgroundColor: "transparent",
                      },
                    })}
                  />
                </Box>

                <Divider
                  sx={{
                    borderColor: "#E5E7EB",
                    my: 1.25,
                  }}
                />

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    width: "100%",
                  }}
                >
                  <Button
                    aria-label="Send project description"
                    onClick={handleSendMessage}
                    disabled={!projectMessage.trim()}
                    variant="contained"
                    sx={{
                      color: "#fff",
                      backgroundColor: "#083a6b",
                      borderRadius: "25px",
                      height: 48,
                      px: 3,
                      display: "flex",
                      alignItems: "center",
                      boxShadow: 2,
                      fontWeight: 700,
                      fontSize: "1.05rem",
                      gap: 1.5,
                      letterSpacing: 0.2,
                      "&:hover": { backgroundColor: "#0A4C88" },
                      "&.Mui-disabled": {
                        backgroundColor: "#D1D5DB",
                        color: "#fff",
                      },
                    }}
                    endIcon={<AutoAwesome sx={{ fontSize: 22 }} />}
                  >
                    Create a Quote
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
        <Box
          className="flex justify-self-center mt-4 mb-16"
          sx={{ px: { md: "32px" }, maxWidth: "1200px" }}
        >
          <img
            src="images/landing.webp"
            alt="Desktop Illustration"
            className="animate-slideUp transition duration-500 delay-200"
            style={{
              height: "auto",
              display: "block",
            }}
          />
        </Box>
      </Box>

      {/* How It Works Section */}
      <Box
        sx={{
          margin: "0 auto",
          mb: 8,
          maxWidth: "1200px",
          padding: { xs: "0 16px", sm: "0 16px" },
        }}
      >
        <Grid container spacing={4} sx={{ width: "100%", marginLeft: "0" }}>
          {[
            {
              icon: faUser,
              title: "Create Customer Quote",
              text: "Customers request a quote. The business reviews the request and prepares pricing details.",
            },
            {
              icon: faPaperPlane,
              title: "Send Quote to Customer",
              text: "Once ready, the quote is sent to the customer via a secure link or email for their review.",
            },
            {
              icon: faThumbsUp,
              title: "Customer Accepts or Declines",
              text: "The customer reviews the quote and chooses to accept or decline it to move forward.",
            },
          ].map((item, idx) => (
            <Grid
              key={idx}
              item
              xs={12}
              md={4}
              sx={{
                textAlign: "center",
                paddingLeft: "0 !important",
                width: "350px",
              }}
            >
              <Box className="flex flex-col items-center text-center">
                <Box
                  sx={{
                    backgroundColor: "#083a6b",
                    borderRadius: "50%",
                    width: "80px",
                    height: "80px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                  }}
                >
                  <FontAwesomeIcon
                    icon={item.icon}
                    style={{ fontSize: "40px", color: "#fff" }}
                  />
                </Box>
                <Typography
                  variant="h6"
                  className="animate-slideUp transition duration-500 delay-200"
                  sx={{
                    fontWeight: "bold",
                    marginTop: "8px",
                    color: "#083a6b",
                  }}
                >
                  {item.title}
                </Typography>
                <Typography
                  variant="body1"
                  className="animate-slideUp transition duration-500 delay-250"
                  sx={{ marginTop: "8px", color: "#6B7280" }}
                >
                  {item.text}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* FAQ Section */}
      <Box
        id="landing-faq"
        sx={{
          backgroundColor: "#F3F4F6",
          paddingTop: "64px",
          paddingBottom: "64px",
          scrollMarginTop: "16px",
        }}
      >
        <Typography
          variant="h4"
          fontWeight="bold"
          className="text-center"
          sx={{ color: "#083a6b", mb: 4 }}
        >
          Frequently Asked Questions
        </Typography>
        <Box className="flex flex-col w-full max-w-2xl mx-auto">
          {[
            {
              q: "What is SendQuote?",
              a: "SendQuote is a simple, professional tool that lets you create customisable quotes your customers can accept instantly – helping you win and manage more jobs with ease.",
            },
            {
              q: "Who is SendQuote for?",
              a: "SendQuote is ideal for individuals and small businesses who need a quick and efficient way to create, send, and manage quotes.",
            },
            {
              q: "Why join the waitlist?",
              a: "Join the waitlist to be the first to know when we launch — simplify your quoting process and stand out to customers.",
            },
          ].map((item, idx) => (
            <Accordion
              key={idx}
              sx={{ backgroundColor: "transparent", boxShadow: "none" }}
            >
              <AccordionSummary
                expandIcon={<FontAwesomeIcon icon={faChevronDown} />}
              >
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{ color: "#083a6b" }}
                >
                  {item.q}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography sx={{ color: "#6B7280" }} fontWeight={500}>
                  {item.a}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
          <Typography
            variant="subtitle1"
            fontWeight="bold"
            className="text-center"
            sx={{ color: "#6B7280", marginTop: "16px", marginBottom: "16px" }}
          >
            Still have questions? Ask us at{" "}
            <Link
              href="mailto:support@sendquote.ai"
              sx={{
                color: "#083a6b",
                fontWeight: "bold",
                textDecoration: "underline",
              }}
            >
              support@sendquote.ai
            </Link>
          </Typography>
        </Box>

        <Box className="flex flex-col items-center justify-center mt-8">
          <Button
            variant="contained"
            onClick={scrollToPrompt}
            className="animate-slideUp transition duration-500 delay-250"
            sx={{
              alignSelf: "center",
              backgroundColor: "#fff",
              color: "#083a6b",
              border: "1px solid #083a6b",
              "&:hover": {
                backgroundColor: "#f0f0f0",
                color: "#083a6b",
              },
            }}
          >
            Start your quote
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Landing;
