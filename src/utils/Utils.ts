export const getRegionCodes = (): string[] => {
  let result: string[] = Array.from({ length: 95 }, (v, k) => k + 1)
    .filter((elt) => elt !== 20)
    .map((elt) =>
      elt.toLocaleString("fr-FR", {
        minimumIntegerDigits: 2,
        useGrouping: false,
      })
    );
  return result.concat(["2A", "2B"]);
};
