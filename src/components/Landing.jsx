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
} from "@mui/material";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faUser,
  faThumbsUp,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import ReCAPTCHA from "react-google-recaptcha";

const Landing = () => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [recaptchaVerified, setRecaptchaVerified] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [showRecaptcha, setShowRecaptcha] = useState(false);

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  const handleChange = (e) => {
    setEmail(e.target.value);
    setEmailError(false);
  };

  const handleRecaptchaChange = (value) => {
    setRecaptchaVerified(!!value);
  };

  const handleRequestAccess = async () => {
    if (!validateEmail(email)) {
      setEmailError(true);
      setFailCount(failCount + 1);
      if (failCount >= 1) setShowRecaptcha(true);

      const emailInput = document.getElementById("emailAddressTextField");
      if (emailInput) emailInput.focus();
      return;
      return;
    }
    if (showRecaptcha && !recaptchaVerified) {
      alert("Please complete the reCAPTCHA verification.");
      return;
    }

    try {
      await addDoc(collection(db, "emails"), {
        email,
        sentAt: new Date()
          .toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
          .replace(/(\d{1,2})/, (d) => {
            // Add ordinal suffix
            const n = Number(d);
            if (n > 3 && n < 21) return `${n}th`;
            switch (n % 10) {
              case 1:
                return `${n}st`;
              case 2:
                return `${n}nd`;
              case 3:
                return `${n}rd`;
              default:
                return `${n}th`;
            }
          }),
      });
      setSuccessMessage(true);
    } catch (error) {
      console.error("Error adding email to Firestore:", error);
      alert("Something went wrong. Please try again later.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleRequestAccess();
    }
  };

  const scrollToRequestAccess = () => {
    const emailAddressInput = document.getElementById("emailAddressTextField");
    if (emailAddressInput) {
      emailAddressInput.focus(); // Focus immediately on user gesture
      emailAddressInput.scrollIntoView({ behavior: "smooth", block: "center" });
      // Optionally, re-focus after scrolling for non-iOS browsers
      setTimeout(() => {
        emailAddressInput.focus();
      }, 900);
    }
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
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
          className="flex flex-col md:flex-row items-start justify-center gap-5 px-4 pt-16"
          sx={{ maxWidth: "1200px", margin: "0 auto" }}
        >
          <Box className="flex-1 md:flex-1/2" width="100%">
            <Box justifySelf="center" maxWidth="900px">
              <Box textAlign="center" display="grid">
                <Link to="/" tabIndex={-1} style={{ textDecoration: "none" }}>
                  <Typography
                    fontSize={32}
                    fontWeight="bold"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#083a6b",
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faPaperPlane}
                      style={{ marginRight: "8px" }}
                    />
                    SendQuote
                  </Typography>
                </Link>
                <Typography
                  variant="h1"
                  className="animate-slideUp transition duration-500 delay-150"
                  fontSize={48}
                  fontWeight={900}
                  marginTop={8}
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

            {successMessage ? (
              <Box
                sx={{
                  textAlign: "center",
                  marginTop: "64px",
                  marginBottom: "64px",
                  backgroundColor: "#083a6b",
                  padding: "16px",
                  borderRadius: "8px",
                  maxWidth: "600px",
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                <Typography variant="h6" color="#fff" fontSize={16}>
                  You're on the list! We'll email you when we launch. 🚀
                </Typography>
              </Box>
            ) : (
              <Box
                className="flex flex-row items-center justify-center gap-2 mb-2"
                id="request-access"
                sx={{
                  display: "flex",
                  alignItems: "start",
                  gap: { xs: 0, sm: "8px" },
                  flexWrap: "nowrap",
                  flexDirection: { xs: "column", sm: "row" }, // Stack on mobile, row on larger screens
                  marginBottom: "48px",
                  width: "100%",
                  maxWidth: "600px",
                  mx: "auto",
                }}
              >
                <TextField
                  label="Enter your email address"
                  variant="outlined"
                  value={email}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  error={emailError}
                  helperText={
                    emailError && (
                      <span style={{ fontWeight: 600 }}>
                        Enter a valid email address (e.g. name@example.com)
                      </span>
                    )
                  }
                  className="animate-slideUp transition duration-500 delay-250"
                  sx={{
                    width: { xs: "100%", sm: "350px" },
                    "& .MuiOutlinedInput-root": {
                      height: "56px",
                      "&:hover fieldset": { borderColor: "#083a6b" },
                      "&.Mui-focused fieldset": { borderColor: "#083a6b" },
                    },
                  }}
                  id="emailAddressTextField"
                />

                <Button
                  variant="contained"
                  color="primary"
                  className="animate-slideUp transition duration-500 delay-250"
                  sx={{
                    fontSize: "1rem",
                    padding: "6px 16px",
                    minWidth: "auto",
                    height: "56px",
                    whiteSpace: "nowrap",
                    width: { xs: "100%", sm: "auto" }, // 100% width on mobile
                    mt: { xs: 1, sm: 0 }, // Add margin top on mobile for spacing
                  }}
                  onClick={handleRequestAccess}
                >
                  Join the waitlist
                </Button>
              </Box>
            )}

            {!successMessage && validateEmail(email) && showRecaptcha && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "12px",
                  marginBottom: "24px",
                }}
              >
                <ReCAPTCHA sitekey={siteKey} onChange={handleRecaptchaChange} />
              </Box>
            )}
          </Box>
        </Box>
        <Box
          className="flex justify-center mb-12"
          sx={{
            px: { xs: "16px", sm: "32px" },
          }}
        >
          <img
            src="/images/landing.png"
            alt="Desktop Illustration"
            className="animate-slideUp transition duration-500 delay-200"
            style={{
              maxWidth: "100%",
              width: "100%",
              height: "auto",
              borderRadius: "12px",
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
                    marginTop: "16px",
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
        sx={{
          backgroundColor: "#F3F4F6",
          paddingTop: "64px",
          paddingBottom: "64px",
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
        <Box
          className="flex flex-col w-full max-w-2xl mx-auto"
          sx={{ px: { xs: "1rem", md: 0 } }}
        >
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
              a: "Joining the waitlist gives you early access to SendQuote - be among the first to simplify your quoting process and stand out to potential clients.",
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
              href="mailto:support@sendquote.app"
              sx={{
                color: "#083a6b",
                fontWeight: "bold",
                textDecoration: "underline",
              }}
            >
              support@sendquote.app
            </Link>
          </Typography>
        </Box>

        {!successMessage && (
          <Box className="flex flex-col items-center justify-center mt-8">
            <Button
              variant="contained"
              onClick={scrollToRequestAccess}
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
              Join the waitlist
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Landing;
