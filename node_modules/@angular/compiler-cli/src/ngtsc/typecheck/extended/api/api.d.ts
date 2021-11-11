/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/typecheck/extended/api/api" />
import { AST, TmplAstNode } from '@angular/compiler';
import * as ts from 'typescript';
import { ErrorCode } from '../../../diagnostics';
import { NgTemplateDiagnostic, TemplateTypeChecker } from '../../api';
/**
 * A Template Check receives information about the template it's checking and returns
 * information about the diagnostics to be generated.
 */
export interface TemplateCheck<T extends ErrorCode> {
    /** Unique template check code, used for configuration and searching the error. */
    code: T;
    /** Runs check and returns information about the diagnostics to be generated. */
    run(ctx: TemplateContext, component: ts.ClassDeclaration, template: TmplAstNode[]): NgTemplateDiagnostic<T>[];
}
/**
 * The TemplateContext provided to a Template Check to get diagnostic information.
 */
export interface TemplateContext {
    /** Interface that provides information about template nodes. */
    templateTypeChecker: TemplateTypeChecker;
    /**
     * TypeScript interface that provides type information about symbols that appear
     * in the template (it is not to query types outside the Angular component).
     */
    typeChecker: ts.TypeChecker;
}
/**
 * This abstract class provides a base implementation for the run method.
 */
export declare abstract class TemplateCheckWithVisitor<T extends ErrorCode> implements TemplateCheck<T> {
    abstract code: T;
    /**
     * Base implementation for run function, visits all nodes in template and calls
     * `visitNode()` for each one.
     */
    run(ctx: TemplateContext, component: ts.ClassDeclaration, template: TmplAstNode[]): NgTemplateDiagnostic<T>[];
    /**
     * Visit a TmplAstNode or AST node of the template. Authors should override this
     * method to implement the check and return diagnostics.
     */
    abstract visitNode(ctx: TemplateContext, component: ts.ClassDeclaration, node: TmplAstNode | AST): NgTemplateDiagnostic<T>[];
}
