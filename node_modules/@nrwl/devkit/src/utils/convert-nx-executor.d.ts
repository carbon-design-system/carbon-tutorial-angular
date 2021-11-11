import type { Executor } from '@nrwl/tao/src/shared/workspace';
/**
 * Convert an Nx Executor into an Angular Devkit Builder
 *
 * Use this to expose a compatible Angular Builder
 */
export declare function convertNxExecutor(executor: Executor): any;
