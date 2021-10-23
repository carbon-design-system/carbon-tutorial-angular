/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/typecheck/extended/checks/invalid_banana_in_box" />
import { AST, TmplAstNode } from '@angular/compiler';
import * as ts from 'typescript';
import { ErrorCode } from '../../../../diagnostics';
import { NgTemplateDiagnostic } from '../../../api';
import { TemplateCheckWithVisitor, TemplateContext } from '../../api';
/**
 * Ensures the two-way binding syntax is correct.
 * Parentheses should be inside the brackets "[()]".
 * Will return diagnostic information when "([])" is found.
 */
export declare class InvalidBananaInBoxCheck extends TemplateCheckWithVisitor<ErrorCode.INVALID_BANANA_IN_BOX> {
    code: ErrorCode.INVALID_BANANA_IN_BOX;
    visitNode(ctx: TemplateContext, component: ts.ClassDeclaration, node: TmplAstNode | AST): NgTemplateDiagnostic<ErrorCode.INVALID_BANANA_IN_BOX>[];
}
