/**
 * Types for the client-hosting edge worker so the production-hardening tests
 * can exercise its real host-validation logic without loosening type checks.
 */
declare const worker: {
  fetch(request: Request): Promise<Response>;
};
export default worker;
