/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/typecheck/extended/src/extended_template_checker" />
import * as ts from 'typescript';
import { ErrorCode } from '../../../diagnostics';
import { TemplateDiagnostic, TemplateTypeChecker } from '../../api';
import { ExtendedTemplateChecker, TemplateCheck } from '../api';
export declare class ExtendedTemplateCheckerImpl implements ExtendedTemplateChecker {
    private readonly templateChecks;
    private ctx;
    constructor(templateTypeChecker: TemplateTypeChecker, typeChecker: ts.TypeChecker, templateChecks: TemplateCheck<ErrorCode>[]);
    getDiagnosticsForComponent(component: ts.ClassDeclaration): TemplateDiagnostic[];
}
