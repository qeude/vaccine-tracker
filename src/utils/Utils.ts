export const getRegionCodes = (): string[] => {
  let result: string[] = [0, 95].map((elt) =>
    elt.toLocaleString("fr-FR", {
      minimumIntegerDigits: 2,
      useGrouping: false,
    })
  );
  return result.concat(["2A", "2B"]);
};
