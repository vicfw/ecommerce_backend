export const dateAddition = (minutes: number) => {
  const now = new Date();
  const extraTwoMinutes = minutes * 60 * 1000;
  return new Date(now.getTime() + extraTwoMinutes);
};
