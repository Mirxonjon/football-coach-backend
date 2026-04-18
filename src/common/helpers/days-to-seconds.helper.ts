const daysToSeconds = (days: number): number => {
  if (days <= 0) {
    throw new Error('Days cannot be negative or zero');
  }
  return days * 24 * 60 * 60; // Convert days to seconds
};

export default daysToSeconds;
