import type * as ESLintLibrary from 'eslint';
import type { Schema } from '../schema';
export declare function loadESLint(): Promise<typeof ESLintLibrary>;
export declare function lint(workspaceRoot: string, eslintConfigPath: string | undefined, options: Schema): Promise<ESLintLibrary.ESLint.LintResult[]>;
