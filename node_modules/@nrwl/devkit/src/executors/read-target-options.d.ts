import type { Target } from '@nrwl/tao/src/commands/run';
import type { ExecutorContext } from '@nrwl/tao/src/shared/workspace';
/**
 * Reads and combines options for a given target.
 *
 * Works as if you invoked the target yourself without passing any command lint overrides.
 */
export declare function readTargetOptions<T = any>({ project, target, configuration }: Target, context: ExecutorContext): T;
