import { useEffect, useMemo, useState } from "react";
import {
  QUOTE_EXAMPLE_CATEGORIES,
  QUOTE_EXAMPLES_GROUP_SIZE,
  buildExamplePlaceholderSequence,
} from "../helpers/quoteExamplePlaceholders";

/**
 * Typewriter loop for multiline placeholder text. Pauses when `enabled` is false.
 * @param {boolean} enabled — run animation only while true (e.g. empty input).
 * @param {string} currencySymbol — narrow symbol for £ placeholders (e.g. $, €).
 */
export function useTypewriterPlaceholder(enabled, currencySymbol = "£") {
  const examplesOrder = useMemo(
    () =>
      buildExamplePlaceholderSequence(
        QUOTE_EXAMPLE_CATEGORIES,
        QUOTE_EXAMPLES_GROUP_SIZE,
        currencySymbol,
      ),
    [currencySymbol],
  );

  const [twIndex, setTwIndex] = useState(0);
  const [twChar, setTwChar] = useState(0);
  const [twMode, setTwMode] = useState("typing");

  useEffect(() => {
    setTwIndex(0);
    setTwChar(0);
    setTwMode("typing");
  }, [currencySymbol]);

  useEffect(() => {
    if (!enabled) return;

    const full = examplesOrder[twIndex];
    if (!full) return;

    let timeoutId;

    if (twMode === "typing") {
      if (twChar < full.length) {
        timeoutId = setTimeout(() => {
          setTwChar((c) => c + 1);
        }, 38 + Math.random() * 52);
      } else {
        timeoutId = setTimeout(() => {
          setTwMode("pause");
        }, 14);
      }
    } else if (twMode === "pause") {
      timeoutId = setTimeout(() => {
        setTwMode("deleting");
      }, 2800 + Math.random() * 1200);
    } else if (twMode === "deleting") {
      if (twChar > 0) {
        timeoutId = setTimeout(() => {
          setTwChar((c) => c - 1);
        }, 16 + Math.random() * 28);
      } else {
        timeoutId = setTimeout(() => {
          setTwIndex((i) => (i + 1) % examplesOrder.length);
          setTwMode("typing");
        }, 450 + Math.random() * 250);
      }
    }

    return () => clearTimeout(timeoutId);
  }, [enabled, examplesOrder, twIndex, twChar, twMode]);

  const animatedPlaceholder = examplesOrder[twIndex]?.slice(0, twChar) ?? "";

  return { animatedPlaceholder, twIndex };
}
