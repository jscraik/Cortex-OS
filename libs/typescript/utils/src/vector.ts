export const dot = (a: number[], b: number[]): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
};

export const norm = (a: number[]): number => {
  return Math.sqrt(dot(a, a));
};

export const cosine = (a: number[], b: number[]): number => {
  const denominator = norm(a) * norm(b);
  return denominator === 0 ? 0 : dot(a, b) / denominator;
};