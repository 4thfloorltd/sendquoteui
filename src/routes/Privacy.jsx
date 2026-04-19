import { Box, Divider, Typography } from "@mui/material";
import PublicNavbar from "../components/PublicNavbar";

const EFFECTIVE_DATE = "14 April 2026";
const CONTACT_EMAIL  = "support@sendquote.ai";
const DOMAIN         = "sendquote.ai";

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

export default function Privacy() {
  return (
    <>
      <PublicNavbar />
      <Box sx={{ maxWidth: 760, mx: "auto", px: { xs: 2, sm: 4 }, py: { xs: 4, md: 6 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#083a6b", mb: 0.5 }}>
          Privacy Policy
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Effective date: {EFFECTIVE_DATE}
        </Typography>
        <Divider sx={{ mb: 4 }} />

        <Section title="1. Who we are">
          <P>
            SendQuote ("we", "us", "our") operates the website {DOMAIN} and provides quote
            management software for small businesses. For any privacy-related questions please
            contact us at <strong>{CONTACT_EMAIL}</strong>.
          </P>
        </Section>

        <Section title="2. Data we collect">
          <P>When you create an account and use SendQuote we collect:</P>
          <Box component="ul" sx={{ pl: 3, mt: 0 }}>
            <Li><strong>Account information</strong> - your email address, business name, and any business profile details you provide.</Li>
            <Li><strong>Email verification codes</strong> - a one-time 6-digit code sent to your email at registration to verify your address. Codes are short-lived and not stored after verification.</Li>
            <Li><strong>Quote data</strong> - customer names, email addresses, line items, pricing, and any other information you enter when creating a quote. If you use Send or Resend quote, we use the customer email and quote content you provided to deliver that message; the customer does not need a SendQuote account.</Li>
            <Li><strong>Quote usage counters</strong> - a count of quotes created, associated with your email, used to enforce free plan limits.</Li>
            <Li><strong>Usage data</strong> - pages visited, features used, and interactions with the service, collected via Firebase Analytics.</Li>
            <Li><strong>Payment data</strong> - handled entirely by Stripe. We store only your Stripe customer ID and subscription status; we never see or store card details.</Li>
            <Li><strong>Bug reports</strong> - if you submit a bug report via the Support page, we collect your description and any screenshot you choose to attach. Screenshots are stored in Firebase Storage and are not publicly accessible.</Li>
          </Box>
        </Section>

        <Section title="3. How we use your data">
          <Box component="ul" sx={{ pl: 3, mt: 0 }}>
            <Li>To provide, operate, and improve the SendQuote service.</Li>
            <Li>To verify your email address at registration and when generating public quotes.</Li>
            <Li>To send transactional emails (verification codes, emails to you when a customer accepts or declines a quote, and emails to your customers with a link to view or review an updated quote when you choose to send or resend from the app).</Li>
            <Li>To process and manage your subscription via Stripe.</Li>
            <Li>To investigate and resolve bug reports submitted through the Support page.</Li>
            <Li>To respond to support requests.</Li>
            <Li>To comply with legal obligations.</Li>
          </Box>
          <P>We do not sell your personal data to third parties.</P>
        </Section>

        <Section title="4. Data storage & processors">
          <P>Your data is stored and processed using the following third-party services:</P>
          <Box component="ul" sx={{ pl: 3, mt: 0 }}>
            <Li><strong>Firebase (Google)</strong> - authentication, database (Firestore), file storage (Firebase Storage), and cloud functions. Data is stored in the <em>us-central1</em> region.</Li>
            <Li><strong>Stripe</strong> - payment processing and subscription management. Stripe's privacy policy applies to data they process: <em>stripe.com/gb/privacy</em>.</Li>
            <Li><strong>SMTP email provider</strong> - used to send verification codes, customer quote invite and revision emails (including the public quote link and your business details as shown on the quote), owner notifications when a customer responds, and internal bug report alerts. Only the addresses and message content required for each email are transmitted.</Li>
            <Li><strong>Anthropic</strong> - optional AI-powered PDF extraction (Claude). Only the content of PDFs you explicitly upload for parsing is sent; no other data is shared.</Li>
          </Box>
        </Section>

        <Section title="5. Cookies">
          <P>
            SendQuote uses session storage (not cookies) to support page routing on this
            single-page application. We do not use third-party advertising or tracking cookies.
            Firebase may set functional cookies required for authentication.
          </P>
        </Section>

        <Section title="6. Data retention">
          <P>
            We retain your account and quote data for as long as your account is active.
            If you delete your account, all associated data (quotes, profile, counters) is
            permanently deleted within 30 days. Bug reports and any attached screenshots are
            retained for as long as needed to investigate and resolve the issue, after which
            they are deleted. Payment records are retained by Stripe in accordance with their
            own retention policies.
          </P>
        </Section>

        <Section title="7. Your rights (UK GDPR)">
          <P>As a UK resident you have the right to:</P>
          <Box component="ul" sx={{ pl: 3, mt: 0 }}>
            <Li>Access the personal data we hold about you.</Li>
            <Li>Correct inaccurate data.</Li>
            <Li>Request deletion of your data ("right to be forgotten").</Li>
            <Li>Object to or restrict processing of your data.</Li>
            <Li>Data portability - receive your data in a structured, machine-readable format.</Li>
          </Box>
          <P>
            To exercise any of these rights, email us at <strong>{CONTACT_EMAIL}</strong>.
            We will respond within 30 days.
          </P>
        </Section>

        <Section title="8. Security">
          <P>
            We use industry-standard measures including Firebase security rules, HTTPS
            encryption, and Stripe's PCI-compliant payment infrastructure. No system is
            perfectly secure; please use a strong, unique password for your account.
          </P>
        </Section>

        <Section title="9. Children's privacy">
          <P>
            SendQuote is not directed at children under 16. We do not knowingly collect
            personal data from children. If you believe a child has provided us with data,
            please contact us and we will delete it promptly.
          </P>
        </Section>

        <Section title="10. Changes to this policy">
          <P>
            We may update this Privacy Policy from time to time. We will notify you of
            significant changes by email or by displaying a notice on the website. Continued
            use of the service after changes constitutes your acceptance of the updated policy.
          </P>
        </Section>

        <Section title="11. Contact">
          <P>
            For any privacy queries or to exercise your rights, contact us at{" "}
            <strong>{CONTACT_EMAIL}</strong>.
          </P>
        </Section>
      </Box>
    </>
  );
}
