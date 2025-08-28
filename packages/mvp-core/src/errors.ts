// RFC 9457-ish problem+json
export type Problem = {
  type: string; // URI
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  meta?: Record<string, unknown>;
};

export class AppError extends Error {
  problem: Problem;
  constructor(problem: Problem) {
    super(problem.title);
    this.problem = problem;
  }
}

export const problems = {
  badRequest: (detail?: string): Problem => ({
    type: 'about:blank#bad-request',
    title: 'Bad Request',
    status: 400,
    detail,
  }),
  unauthorized: (): Problem => ({
    type: 'about:blank#unauthorized',
    title: 'Unauthorized',
    status: 401,
  }),
  forbidden: (): Problem => ({ type: 'about:blank#forbidden', title: 'Forbidden', status: 403 }),
  notFound: (detail?: string): Problem => ({
    type: 'about:blank#not-found',
    title: 'Not Found',
    status: 404,
    detail,
  }),
  conflict: (detail?: string): Problem => ({
    type: 'about:blank#conflict',
    title: 'Conflict',
    status: 409,
    detail,
  }),
  internal: (detail?: string): Problem => ({
    type: 'about:blank#internal',
    title: 'Internal Error',
    status: 500,
    detail,
  }),
};
