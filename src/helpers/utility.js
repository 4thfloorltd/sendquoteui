export const capitaliseWords = (str) => {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const formatNumberWithCommas = (value) => {
  if (value === null || value === undefined || value === "") return "";
  // Remove non-numeric except dot
  const num =
    typeof value === "number" ? value : value.toString().replace(/,/g, "");
  if (isNaN(num)) return value;
  // Format with commas, keep decimals if present
  const [intPart, decimalPart] = num.split ? num.split(".") : [num, null];
  const formattedInt = parseInt(intPart, 10).toLocaleString("en-GB");
  return decimalPart !== undefined && decimalPart !== null && decimalPart !== ""
    ? `${formattedInt}.${decimalPart}`
    : formattedInt;
};

export const formatUkPhoneNumber = (input) => {
  // Remove all non-digit characters except +
  let cleaned = input.replace(/[^\d+]/g, "");

  // Extract digits only for length check
  let digits = cleaned.replace(/[^\d]/g, "");

  // Set allowed digit count based on prefix
  let allowedDigits = 0;
  if (cleaned.startsWith("+44")) {
    allowedDigits = 12;
  } else if (
    cleaned.startsWith("07") ||
    cleaned.startsWith("01") ||
    cleaned.startsWith("02")
  ) {
    allowedDigits = 11;
  }

  // If digits exceed allowed, truncate them without removing existing spaces
  if (allowedDigits && digits.length > allowedDigits) {
    // Truncate the digits to allowed length
    const truncatedDigits = digits.slice(0, allowedDigits);

    // Rebuild the cleaned string using the original prefix
    if (cleaned.startsWith("+44")) {
      // For +44 numbers, the prefix '+44' should remain, then append the rest of the digits
      // Note: digits include '44' at the start, so we keep them as is.
      cleaned = "+44" + truncatedDigits.slice(2);
    } else {
      cleaned = truncatedDigits;
    }
  }

  // Now proceed with formatting
  // Format for +44 UK numbers: +44 7123 456 789
  if (cleaned.startsWith("+44")) {
    cleaned = cleaned
      .replace(/^(\+44)(\d{0,4})(\d{0,3})(\d{0,3})$/, (m, p1, p2, p3, p4) =>
        [p1, p2, p3, p4].filter(Boolean).join(" ")
      )
      .trim();
  }
  // Format for 07 UK numbers: 07123 456 789
  else if (cleaned.startsWith("07")) {
    cleaned = cleaned
      .replace(/^(07\d{0,3})(\d{0,3})(\d{0,3})$/, (m, p1, p2, p3) =>
        [p1, p2, p3].filter(Boolean).join(" ")
      )
      .trim();
  }
  // Format for 01/02 UK landlines: 01234 567890 or 020 1234 5678
  else if (cleaned.startsWith("01") || cleaned.startsWith("02")) {
    // Try 5+6 split (e.g. 01234 567890)
    cleaned = cleaned.replace(/^(\d{0,5})(\d{0,6})$/, (m, p1, p2) =>
      [p1, p2].filter(Boolean).join(" ")
    );
    // Try 3+4+4 split (e.g. 020 1234 5678)
    cleaned = cleaned.replace(
      /^(\d{0,3}) ?(\d{0,4}) ?(\d{0,4})$/,
      (m, p1, p2, p3) => [p1, p2, p3].filter(Boolean).join(" ")
    );
  }

  return cleaned;
};
export const formatUkPostcode = (input) => {
  // Remove all non-alphanumeric characters except spaces
  let cleaned = input.replace(/[^a-zA-Z0-9 ]/g, "").toUpperCase();

  // Limit to 8 characters (max length for UK postcodes)
  if (cleaned.length > 8) {
    cleaned = cleaned.slice(0, 8);
  }

  // Format UK postcode: A9 9AA or A99 9AA or AA9 9AA or AA99 9AA
  cleaned = cleaned.replace(
    /^([A-Z]{1,2})(\d{1,2}) ?(\d{1,2})([A-Z]{2})$/,
    (m, p1, p2, p3, p4) => `${p1}${p2} ${p3}${p4}`
  );

  return cleaned.trim();
};
