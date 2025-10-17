export const dot = (a, b) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
};
export const norm = (a) => {
    return Math.sqrt(dot(a, a));
};
export const cosine = (a, b) => {
    const denominator = norm(a) * norm(b);
    return denominator === 0 ? 0 : dot(a, b) / denominator;
};
