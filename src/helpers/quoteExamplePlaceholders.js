/**
 * Shared example strings for landing + quote typewriter placeholders.
 * Grouped by category; each animation cycle types up to `groupSize` lines per category (newline-separated).
 */
export const QUOTE_EXAMPLE_CATEGORIES = [
  [
    "Grass cutting 50sqm £100",
    "Grass cut medium garden £80 + hedge trimming £60",
    "Full garden tidy up £150 includes weeding and mowing",
    "Hedge trimming 10m £90 + lawn mowing £70",
    "Garden clearance overgrown £250 with waste removal",
    "Monthly maintenance £120 per visit",
    "Grass cutting large garden £140 + patio cleaning £100",
    "End of tenancy garden clean £180 all in",
  ],
  [
    "End of tenancy clean 2 bed flat £200",
    "Deep clean 3 bed house £250",
    "Carpet cleaning 3 rooms £90",
    "Office cleaning weekly £120 per visit",
    "After builders clean £300 full property",
    "Airbnb turnover clean £80 including linen",
    "Kitchen deep clean + oven £70",
  ],
  [
    "Fix leaking tap £60",
    "TV wall mounting £100",
    "Furniture assembly x3 items £120",
    "Door repair + handle replacement £80",
    "Paint 1 room £200 labour only",
    "General handyman 3 hours £150",
  ],
  [
    "Laminate flooring 40sqm £800",
    "Bathroom renovation £4500 full job",
    "Tile splashback 5sqm £250",
    "Interior painting 3 bed house £1200",
    "Plastering living room £400",
  ],
  [
    "Boiler service £90",
    "Install radiator £180 each x2",
    "Lighting install x6 £300",
    "Fix power issue kitchen £120",
    "AC install £600 single unit",
  ],
  [
    "2 bed flat move £400 within London",
    "Small van job £120",
    "Office move £900",
    "Packing + moving full house £700",
    "Single item delivery £60",
  ],
  [
    "grass cut 50sqm 100 hedge 60",
    "deep clean 2 bed £180 carpet 3 rooms 90",
    "paint room 200 + door fix 50",
    "garden tidy 150 inc waste",
    "laminate flooring 800 40sqm",
    "move flat 400 + packing 150",
    "3hr handyman 150",
  ],
];

export const QUOTE_EXAMPLES_GROUP_SIZE = 3;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildExamplePlaceholderSequence(
  categories = QUOTE_EXAMPLE_CATEGORIES,
  groupSize = QUOTE_EXAMPLES_GROUP_SIZE,
) {
  const sequence = [];
  for (const cat of categories) {
    const items = shuffle(cat);
    for (let i = 0; i < items.length; i += groupSize) {
      sequence.push(items.slice(i, i + groupSize).join("\n"));
    }
  }
  return shuffle(sequence);
}
