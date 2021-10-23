/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/typecheck/extended/checks/nullish_coalescing_not_nullable" />
import { AST, TmplAstNode } from '@angular/compiler';
import * as ts from 'typescript';
import { ErrorCode } from '../../../../diagnostics';
import { NgTemplateDiagnostic } from '../../../api';
import { TemplateCheckWithVisitor, TemplateContext } from '../../api';
/**
 * Ensures the left side of a nullish coalescing operation is nullable.
 * Returns diagnostics for the cases where the operator is useless.
 * This check should only be use if `strictNullChecks` is enabled,
 * otherwise it would produce inaccurate results.
 */
export declare class NullishCoalescingNotNullableCheck extends TemplateCheckWithVisitor<ErrorCode.NULLISH_COALESCING_NOT_NULLABLE> {
    code: ErrorCode.NULLISH_COALESCING_NOT_NULLABLE;
    visitNode(ctx: TemplateContext, component: ts.ClassDeclaration, node: TmplAstNode | AST): NgTemplateDiagnostic<ErrorCode.NULLISH_COALESCING_NOT_NULLABLE>[];
}
