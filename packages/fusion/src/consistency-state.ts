/**
 * ConsistencyState — lifecycle state of a Computed value.
 *
 * Mirrors ActualLab.Fusion ConsistencyState.
 * One-way transitions: Computing → Consistent → Invalidated
 */

export const ConsistencyState = {
  Computing: 0,
  Consistent: 1,
  Invalidated: 2,
} as const;

export type ConsistencyState =
  (typeof ConsistencyState)[keyof typeof ConsistencyState];
