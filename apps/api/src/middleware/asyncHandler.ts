import type { NextFunction, Request, Response } from "express";

// Wraps async route handlers so rejected promises reach the error middleware
// instead of crashing the process (Express 4 has no built-in support).
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
