/**
 * Single source for homepage FAQ copy + FAQPage JSON-LD (see applyPageSeo.js).
 * Answers are plain text for schema.org and consistent rendering.
 */
import { FREE_QUOTE_LIMIT } from "../constants/plan";

export const HOMEPAGE_FAQ = [
  {
    question: "What is SendQuote?",
    answer:
      "SendQuote helps tradespeople, freelancers, and small businesses draft quotes, send them online, and track accept or decline.",
  },
  {
    question: "Is SendQuote free to send quotes online?",
    answer:
      `Yes! You can get started for free and send up to ${FREE_QUOTE_LIMIT} quotes at the same time. When you need unlimited quotes, PDF import, editing sent quotes, saving customer info, or priority support—you can upgrade to Premium.`,
  },
  {
    question: "How do I get started and send a quote to my customer?",
    answer:
      "To get started, create a quote, enter your business and customer information, add line items with prices and VAT, and click Send quote. Your customer will receive a secure link and can accept or decline on any device with no sign-in required.",
  },
  {
    question: "Can I create and send invoices with SendQuote?",
    answer:
      "Yes. Create an invoice from scratch or convert an accepted quote. Send a secure link so your customer can view it online. They can pay using the bank details shown on the invoice, and you can track whether it's unpaid or paid from your account.",
  },
];
