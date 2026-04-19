import { Box, Divider, Typography } from "@mui/material";
import PublicNavbar from "../components/PublicNavbar";

const EFFECTIVE_DATE  = "14 April 2026";
const CONTACT_EMAIL   = "support@sendquote.ai";
const PREMIUM_PRICE   = "£9.99";

const Section = ({ title, children }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="h6" sx={{ fontWeight: 700, color: "#083a6b", mb: 1.5 }}>
      {title}
    </Typography>
    {children}
  </Box>
);

const P = ({ children }) => (
  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25, lineHeight: 1.8 }}>
    {children}
  </Typography>
);

const Li = ({ children }) => (
  <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.75, lineHeight: 1.8 }}>
    {children}
  </Typography>
);

export default function Terms() {
  return (
    <>
      <PublicNavbar />
      <Box sx={{ maxWidth: 760, mx: "auto", px: { xs: 2, sm: 4 }, py: { xs: 4, md: 6 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#083a6b", mb: 0.5 }}>
          Terms of Service
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Effective date: {EFFECTIVE_DATE}
        </Typography>
        <Divider sx={{ mb: 4 }} />

        <Section title="1. Acceptance of terms">
          <P>
            By creating an account or using SendQuote ("the Service") you agree to be bound
            by these Terms of Service. If you do not agree, do not use the Service.
          </P>
        </Section>

        <Section title="2. Description of service">
          <P>
            SendQuote is a web-based quote management tool that allows businesses to create,
            send, and track quotes. Features include:
          </P>
          <Box component="ul" sx={{ pl: 3, mt: 0 }}>
            <Li>AI-assisted quote drafting from a plain-language description or uploaded PDF.</Li>
            <Li>Sharing quotes with customers via a secure link, optional automated emails to the customer&apos;s address when you send or resend from the app, or other channels (e.g. WhatsApp) — no customer sign-in required.</Li>
            <Li>Real-time notifications when a customer views, accepts, or declines a quote.</Li>
            <Li>Billing and subscription management via Stripe.</Li>
          </Box>
          <P>The Service is provided on both a free and paid (Premium) subscription basis.</P>
        </Section>

        <Section title="3. Account registration">
          <Box component="ul" sx={{ pl: 3, mt: 0 }}>
            <Li>You must verify your email address with a one-time code before your account is created.</Li>
            <Li>You must provide accurate and complete information when creating an account.</Li>
            <Li>You are responsible for maintaining the confidentiality of your login credentials.</Li>
            <Li>You must be at least 18 years old and have authority to enter into contracts on behalf of any business you represent.</Li>
            <Li>You are responsible for all activity that occurs under your account.</Li>
          </Box>
        </Section>

        <Section title="4. Free plan">
          <P>
            The free plan allows you to create up to <strong>3 quotes</strong> in total. Each
            quote you create - whether pending, accepted, or declined - counts toward this limit.
            Only permanently deleting a quote frees up a slot. Once the limit is reached you must
            upgrade to Premium or delete existing quotes before creating new ones. The free plan
            is provided as-is with no guarantee of availability or support response times.
          </P>
        </Section>

        <Section title="5. Premium subscription">
          <Box component="ul" sx={{ pl: 3, mt: 0 }}>
            <Li>Premium is a monthly subscription at <strong>{PREMIUM_PRICE} per month</strong> (inclusive of VAT where applicable).</Li>
            <Li>Payment is processed securely by Stripe. By subscribing you authorise Stripe to charge your payment method on a recurring monthly basis.</Li>
            <Li>Your subscription renews automatically each month unless cancelled before the renewal date.</Li>
            <Li>You may cancel at any time via the Billing section of your account. Cancellation takes effect at the end of the current billing period; you retain Premium access until then.</Li>
            <Li>We do not offer refunds for partial billing periods unless required by applicable law.</Li>
            <Li>If a payment fails, your account will be downgraded to the free plan after a grace period.</Li>
          </Box>
        </Section>

        <Section title="6. Acceptable use">
          <P>You agree not to use SendQuote to:</P>
          <Box component="ul" sx={{ pl: 3, mt: 0 }}>
            <Li>Create or send fraudulent, misleading, or illegal quotes.</Li>
            <Li>Harass, spam, or send unsolicited communications to third parties.</Li>
            <Li>Attempt to gain unauthorised access to any part of the Service or its infrastructure.</Li>
            <Li>Violate any applicable law or regulation.</Li>
            <Li>Reverse engineer, copy, or redistribute any part of the Service.</Li>
          </Box>
          <P>
            We reserve the right to suspend or terminate accounts that violate these rules
            without notice.
          </P>
        </Section>

        <Section title="7. Intellectual property">
          <P>
            All content, branding, and software comprising SendQuote are owned by us or
            our licensors. You retain ownership of all quote data and customer information
            you input into the Service.
          </P>
          <P>
            You grant us a limited, non-exclusive licence to store and process your data
            solely to provide the Service.
          </P>
        </Section>

        <Section title="8. Data and privacy">
          <P>
            Our collection and use of your personal data is governed by our{" "}
            <a href="/privacy" style={{ color: "#083a6b" }}>Privacy Policy</a>, which forms
            part of these Terms.
          </P>
        </Section>

        <Section title="9. Disclaimer of warranties">
          <P>
            The Service is provided "as is" and "as available" without warranties of any kind,
            express or implied, including but not limited to fitness for a particular purpose,
            merchantability, or uninterrupted availability. We do not warrant that the Service
            will be error-free or that any defects will be corrected.
          </P>
        </Section>

        <Section title="10. Limitation of liability">
          <P>
            To the fullest extent permitted by law, SendQuote shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages, including loss
            of profits, data, or business opportunities, arising from your use of or inability
            to use the Service, even if we have been advised of the possibility of such damages.
          </P>
          <P>
            Our total liability to you for any claim arising from these Terms or your use of
            the Service shall not exceed the total amount paid by you to SendQuote in the
            twelve months preceding the claim.
          </P>
        </Section>

        <Section title="11. Termination">
          <P>
            You may delete your account at any time from the Profile page. Upon deletion,
            all your data is permanently removed within 30 days.
          </P>
          <P>
            We may suspend or terminate your account if you breach these Terms, if your
            payment repeatedly fails, or if we decide to discontinue the Service, with
            reasonable notice where practicable.
          </P>
        </Section>

        <Section title="12. Changes to these terms">
          <P>
            We may update these Terms from time to time. We will give you at least 14 days'
            notice of material changes by email or in-app notification. Continued use of the
            Service after the effective date of changes constitutes acceptance of the new Terms.
          </P>
        </Section>

        <Section title="13. Governing law">
          <P>
            These Terms are governed by and construed in accordance with the laws of England
            and Wales. Any disputes shall be subject to the exclusive jurisdiction of the
            courts of England and Wales.
          </P>
        </Section>

        <Section title="14. Contact">
          <P>
            If you have questions about these Terms, please contact us at{" "}
            <strong>{CONTACT_EMAIL}</strong>.
          </P>
        </Section>
      </Box>
    </>
  );
}
