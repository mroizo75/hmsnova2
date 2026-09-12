/** Løft SERVICE → HMS skjer kun lokalt. Samme Tripletex-prosjekt beholdes. */
export function promoteKeepsExternalProject(): true {
  return true;
}

export function jobKindAfterPromote(): "HMS" {
  return "HMS";
}
