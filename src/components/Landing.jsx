import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Chip,
  Grid,
  Link,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from "@mui/material";
import { keyframes } from "@mui/system";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
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
import PricingPlanComparison from "./PricingPlanComparison";
import { getCurrencyNarrowSymbol, getDefaultCurrency } from "../helpers/currency";
import { HOMEPAGE_FAQ } from "../seo/homepageFaq";

const annotationInLeft = keyframes`
  0%   { opacity: 0; transform: translate(-14px, -10px); }
  60%  { opacity: 1; }
  100% { opacity: 1; transform: translate(0, 0); }
`;

const annotationInRight = keyframes`
  0%   { opacity: 0; transform: translate(14px, 10px); }
  60%  { opacity: 1; }
  100% { opacity: 1; transform: translate(0, 0); }
`;

const Landing = () => {
  const [projectMessage, setProjectMessage] = useState("");
  const navigate = useNavigate();
  const landingCurrencySymbol = getCurrencyNarrowSymbol(getDefaultCurrency()) || "£";

  // Only animate the "customer reviews quote…" annotation once it scrolls into view.
  const rightAnnotationRef = useRef(null);
  const [rightAnnotationVisible, setRightAnnotationVisible] = useState(false);

  useEffect(() => {
    const node = rightAnnotationRef.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setRightAnnotationVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRightAnnotationVisible(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.3, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

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

  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    if (window.location.hash !== "#pricing") return;
    const t = window.setTimeout(() => {
      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(t);
  }, []);

  /** Nav: max-width 425px - logo row, then one full-width row with three equal columns */
  const narrowNavActionsBtnSx = {
    "@media (max-width: 424.95px)": {
      minWidth: 0,
      width: "100%",
      px: 0.5,
      whiteSpace: "nowrap",
      lineHeight: 1.2,
    },
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
            columnGap: { xs: 2, md: 2 },
            // xs: logo | actions (no overlap). md+: spacer | centered logo | actions
            gridTemplateColumns: {
              xs: "minmax(0, 1fr) max-content",
              md: "minmax(0, 1fr) auto minmax(0, 1fr)",
            },
            // <425px: logo row, then full-width row with all three controls
            "@media (max-width: 424.95px)": {
              gridTemplateColumns: "minmax(0, 1fr)",
              rowGap: 1,
              columnGap: 0,
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
              "@media (max-width: 424.95px)": {
                gridColumn: "1",
                justifySelf: "stretch",
                width: "100%",
                minWidth: 0,
                flexShrink: 1,
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                columnGap: 0.5,
                rowGap: 0.5,
                alignItems: "stretch",
              },
            }}
          >
            <Button
              variant="text"
              onClick={scrollToPricing}
              aria-label="Scroll to pricing plans"
              sx={{
                color: "#083a6b",
                fontWeight: 600,
                fontSize: "1rem",
                textTransform: "none",
                minWidth: "auto",
                px: 1,
                ...narrowNavActionsBtnSx,
              }}
            >
              Pricing
            </Button>
            <Button
              variant="text"
              onClick={scrollToFaq}
              aria-label="Scroll to frequently asked questions"
              sx={{
                color: "#083a6b",
                fontWeight: 600,
                fontSize: "1rem",
                textTransform: "none",
                minWidth: "auto",
                px: 1,
                ...narrowNavActionsBtnSx,
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
                ...narrowNavActionsBtnSx,
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
                  fontSize={{ xs: 32, sm: 40, md: 48 }}
                  fontWeight={900}
                  marginTop={{ xs: 2, sm: 4 }}
                  sx={{ color: "#083a6b", lineHeight: 1.15, px: { xs: 0.5, sm: 0 } }}
                >
                Send Quotes Online & Get Faster Customer Approvals
                </Typography>
              </Box>
              <Typography
                variant="body1"
                className="animate-slideUp transition duration-500 delay-200"
                sx={{
                  fontSize: "1.25rem",
                  fontWeight: "500",
                  ml: "auto",
                  mb: 2,
                  mr: "auto",
                  mt: 2,
                  textAlign: "center",
                  maxWidth: "640px",
                  color: "#083a6b",
                }}
              >
                Send secure links - customers can accept, decline, and comment instantly. No sign-in required. Start free..
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
                    currencySymbol={landingCurrencySymbol}
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
                      borderRadius: "10px",
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
          className="flex justify-self-center"
          sx={{ px: { md: "32px" }, maxWidth: "1200px", width: "100%" }}
        >
          <Box
            sx={{
              position: "relative",
              width: "100%",
              pt: { xs: "44px", sm: "52px", md: "60px" },
              pb: { xs: "44px", sm: "52px", md: "60px" },
            }}
          >
            {/* Left annotation - top-left */}
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                top: 0,
                left: { xs: "8px", sm: "2%", md: "4%" },
                width: { xs: 160, sm: 220, md: 260 },
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                pointerEvents: "none",
                zIndex: 2,
                opacity: 0,
                animation: `${annotationInLeft} 1400ms cubic-bezier(0.22, 1, 0.36, 1) 400ms forwards`,
                "@media (prefers-reduced-motion: reduce)": {
                  opacity: 1,
                  animation: "none",
                },
              }}
            >
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  fontFamily: 'Manrope, system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1.05rem" },
                  lineHeight: 1.3,
                  letterSpacing: "0.1px",
                  color: "#083a6b",
                  transform: "rotate(-3deg)",
                  transformOrigin: "left bottom",
                }}
              >
                create quote &amp;
                <br />
                share with customer
              </Box>
            </Box>

            {/* Right annotation - bottom-right */}
            <Box
              ref={rightAnnotationRef}
              aria-hidden
              sx={{
                position: "absolute",
                bottom: 0,
                right: { xs: "8px", sm: "2%", md: "4%" },
                width: { xs: 170, sm: 230, md: 280 },
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                textAlign: "right",
                pointerEvents: "none",
                zIndex: 2,
                opacity: 0,
                animation: rightAnnotationVisible
                  ? `${annotationInRight} 1400ms cubic-bezier(0.22, 1, 0.36, 1) 200ms forwards`
                  : "none",
                "@media (prefers-reduced-motion: reduce)": {
                  opacity: 1,
                  animation: "none",
                },
              }}
            >
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  fontFamily: 'Manrope, system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1.05rem" },
                  lineHeight: 1.3,
                  letterSpacing: "0.1px",
                  color: "#083a6b",
                  transform: "rotate(3deg)",
                  transformOrigin: "right top",
                }}
              >
                customer reviews quote
                <br />
                to accept or decline
              </Box>
            </Box>

            <Box
              sx={{
                width: "100%",
                overflow: "hidden",
                lineHeight: 0,
              }}
            >
              <Box
                component="img"
                src="images/landingImg.webp"
                alt="Desktop Illustration"
                className="animate-slideUp transition duration-500 delay-200"
                sx={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                  transform: "scale(1.08)",
                  transformOrigin: "center center",
                }}
              />
            </Box>
          </Box>
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
        <Grid container rowSpacing={4} columnSpacing={1}>
          {[
            {
              icon: faUser,
              title: "Draft a Quote in Seconds",
              text: "Describe the project and let AI draft a professional quote - or build it yourself with line items, pricing, and descriptions.",
            },
            {
              icon: faPaperPlane,
              title: "Share with Your Customer",
              text: "Send the quote via a secure link, email, or WhatsApp. Customers open it on any device - no sign-in required.",
            },
            {
              icon: faThumbsUp,
              title: "Track Acceptance in Real Time",
              text: "Get notified the moment a customer views, accepts, or declines, so you can follow up fast and close more deals.",
            },
          ].map((item, idx) => (
            <Grid
              key={idx}
              item
              xs={12}
              md={4}
              sx={{ textAlign: "center" }}
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

      {/* Pricing - same plan comparison as Billing */}
      <Box
        id="pricing"
        sx={{
          margin: "0 auto",
          mb: 8,
          maxWidth: "1200px",
          px: { xs: 2, sm: 3 },
          scrollMarginTop: "24px",
        }}
      >
        <Divider sx={{ borderColor: "#E5E7EB", mb: { xs: 4, sm: 6 } }} />
        <Typography
          variant="h4"
          fontWeight={800}
          textAlign="center"
          sx={{ color: "#083a6b", mb: 1 }}
        >
          Simple pricing
        </Typography>
        <Typography
          variant="body1"
          textAlign="center"
          sx={{ color: "#6B7280", mb: 4, maxWidth: "640px", mx: "auto" }}
        >
          Start free, then upgrade to Premium when you need unlimited quotes, PDF import, and more.
        </Typography>
        <PricingPlanComparison
          premiumHeaderAddon={(
            <Chip
              icon={<StarOutlineIcon sx={{ fontSize: 16 }} />}
              label="Recommended"
              size="small"
              sx={{ fontWeight: 700, bgcolor: "#083a6b", color: "#fff", "& .MuiChip-icon": { color: "#fff" } }}
            />
          )}
          freeFooter={(
            <Button
              component={RouterLink}
              to="/register"
              variant="outlined"
              fullWidth
              sx={{
                mt: 3,
                textTransform: "none",
                fontWeight: 700,
                borderColor: "#083a6b",
                color: "#083a6b",
                borderRadius: "10px", // More square, but still lightly rounded
                "&:hover": { borderColor: "#062d52", bgcolor: "rgba(8,58,107,0.04)" },
              }}
            >
              Create free account
            </Button>
          )}
          premiumFooter={(
            <>
              <Button
                component={RouterLink}
                to="/register"
                state={{ redirectAfterProfile: "/secured/billing" }}
                variant="contained"
                fullWidth
                sx={{
                  mt: 3,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "1rem",
                  bgcolor: "#083a6b",
                  borderRadius: "10px", 
                  "&:hover": { bgcolor: "#062d52" },
                }}
              >
                Get Premium
              </Button>
            </>
          )}
        />
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
          component="h2"
          variant="h4"
          fontWeight="bold"
          className="text-center"
          sx={{ color: "#083a6b", mb: 1 }}
        >
          Frequently asked questions
        </Typography>
        <Typography
          variant="body2"
          textAlign="center"
          sx={{ color: "#6B7280", mb: 4, maxWidth: "560px", mx: "auto" }}
        >
          Send a quote to your customer by email, draft quotes online for free, and more.
        </Typography>
        <Box className="flex flex-col w-full max-w-2xl mx-auto">
          {HOMEPAGE_FAQ.map((item) => (
            <Accordion
              key={item.question}
              sx={{ backgroundColor: "transparent", boxShadow: "none" }}
            >
              <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
                <Typography
                  variant="h6"
                  component="h3"
                  fontWeight="bold"
                  sx={{ color: "#083a6b", fontSize: "1.05rem" }}
                >
                  {item.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography sx={{ color: "#6B7280" }} fontWeight={500} component="div">
                  {item.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
          <Typography
            variant="subtitle1"
            fontWeight="bold"
            className="text-center"
            sx={{ color: "#6B7280", marginTop: "32px", marginBottom: "16px" }}
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
