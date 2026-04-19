import React, { createContext, useContext, useMemo, useState } from "react";
import { getDefaultCurrency, getDefaultVatPercent } from "../helpers/currency";

const QuoteContext = createContext(null);

export const isoToday = () => new Date().toISOString().slice(0, 10);

export const newLineItemId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `li-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** Default editable pricing rows for a new quote */
export const createDefaultLineItems = () => [
  { id: newLineItemId(), description: "", unitPrice: 0, quantity: 1, vatPercent: getDefaultVatPercent() },
];

export const createInitialQuoteData = () => ({
  businessName: "",
  businessPhone: "",
  businessAddress: "",
  quoteNumber: "",
  quoteDate: isoToday(),
  customerName: "",
  email: "",
  lineItems: createDefaultLineItems(),
  currency: getDefaultCurrency(),
});

export const QuoteProvider = ({ children }) => {
  const [quoteData, setQuoteData] = useState(createInitialQuoteData);

  const updateQuoteData = (updates) => {
    setQuoteData((prev) => ({
      ...prev,
      ...(typeof updates === "function" ? updates(prev) : updates),
    }));
  };

  const resetQuoteData = () => setQuoteData(createInitialQuoteData());

  const value = useMemo(
    () => ({
      quoteData,
      updateQuoteData,
      resetQuoteData,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quoteData],
  );

  return <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>;
};

export const useQuote = () => {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error("useQuote must be used within a QuoteProvider.");
  }

  return context;
};
