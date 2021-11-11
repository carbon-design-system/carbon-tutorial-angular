/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/typecheck/extended/api/api", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/compiler"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TemplateCheckWithVisitor = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var compiler_2 = require("@angular/compiler/src/compiler");
    /**
     * This abstract class provides a base implementation for the run method.
     */
    var TemplateCheckWithVisitor = /** @class */ (function () {
        function TemplateCheckWithVisitor() {
        }
        /**
         * Base implementation for run function, visits all nodes in template and calls
         * `visitNode()` for each one.
         */
        TemplateCheckWithVisitor.prototype.run = function (ctx, component, template) {
            var visitor = new TemplateVisitor(ctx, component, this);
            return visitor.getDiagnostics(template);
        };
        return TemplateCheckWithVisitor;
    }());
    exports.TemplateCheckWithVisitor = TemplateCheckWithVisitor;
    /**
     * Visits all nodes in a template (TmplAstNode and AST) and calls `visitNode` for each one.
     */
    var TemplateVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(TemplateVisitor, _super);
        function TemplateVisitor(ctx, component, check) {
            var _this = _super.call(this) || this;
            _this.ctx = ctx;
            _this.component = component;
            _this.check = check;
            _this.diagnostics = [];
            return _this;
        }
        TemplateVisitor.prototype.visit = function (node, context) {
            var _a;
            (_a = this.diagnostics).push.apply(_a, tslib_1.__spreadArray([], tslib_1.__read(this.check.visitNode(this.ctx, this.component, node))));
            node.visit(this);
        };
        TemplateVisitor.prototype.visitAllNodes = function (nodes) {
            var e_1, _a;
            try {
                for (var nodes_1 = tslib_1.__values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
                    var node = nodes_1_1.value;
                    this.visit(node);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (nodes_1_1 && !nodes_1_1.done && (_a = nodes_1.return)) _a.call(nodes_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        TemplateVisitor.prototype.visitAst = function (ast) {
            if (ast instanceof compiler_2.ASTWithSource) {
                ast = ast.ast;
            }
            this.visit(ast);
        };
        TemplateVisitor.prototype.visitElement = function (element) {
            this.visitAllNodes(element.attributes);
            this.visitAllNodes(element.inputs);
            this.visitAllNodes(element.outputs);
            this.visitAllNodes(element.references);
            this.visitAllNodes(element.children);
        };
        TemplateVisitor.prototype.visitTemplate = function (template) {
            this.visitAllNodes(template.attributes);
            if (template.tagName === 'ng-template') {
                // Only visit input/outputs/templateAttrs if this isn't an inline template node
                // generated for a structural directive (like `<div *ngIf></div>`). These nodes
                // would be visited when the underlying element of an inline template node is processed.
                this.visitAllNodes(template.inputs);
                this.visitAllNodes(template.outputs);
                this.visitAllNodes(template.templateAttrs);
            }
            this.visitAllNodes(template.variables);
            this.visitAllNodes(template.references);
            this.visitAllNodes(template.children);
        };
        TemplateVisitor.prototype.visitContent = function (content) { };
        TemplateVisitor.prototype.visitVariable = function (variable) { };
        TemplateVisitor.prototype.visitReference = function (reference) { };
        TemplateVisitor.prototype.visitTextAttribute = function (attribute) { };
        TemplateVisitor.prototype.visitBoundAttribute = function (attribute) {
            this.visitAst(attribute.value);
        };
        TemplateVisitor.prototype.visitBoundEvent = function (attribute) {
            this.visitAst(attribute.handler);
        };
        TemplateVisitor.prototype.visitText = function (text) { };
        TemplateVisitor.prototype.visitBoundText = function (text) {
            this.visitAst(text.value);
        };
        TemplateVisitor.prototype.visitIcu = function (icu) { };
        TemplateVisitor.prototype.getDiagnostics = function (template) {
            this.diagnostics = [];
            this.visitAllNodes(template);
            return this.diagnostics;
        };
        return TemplateVisitor;
    }(compiler_1.RecursiveAstVisitor));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svZXh0ZW5kZWQvYXBpL2FwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQWdTO0lBQ2hTLDJEQUE2RDtJQWlDN0Q7O09BRUc7SUFDSDtRQUFBO1FBbUJBLENBQUM7UUFoQkM7OztXQUdHO1FBQ0gsc0NBQUcsR0FBSCxVQUFJLEdBQW9CLEVBQUUsU0FBOEIsRUFDcEQsUUFBdUI7WUFDekIsSUFBTSxPQUFPLEdBQUcsSUFBSSxlQUFlLENBQUksR0FBRyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM3RCxPQUFPLE9BQU8sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUMsQ0FBQztRQVFILCtCQUFDO0lBQUQsQ0FBQyxBQW5CRCxJQW1CQztJQW5CcUIsNERBQXdCO0lBcUI5Qzs7T0FFRztJQUNIO1FBQW1ELDJDQUFtQjtRQUlwRSx5QkFDcUIsR0FBb0IsRUFBbUIsU0FBOEIsRUFDckUsS0FBa0M7WUFGdkQsWUFHRSxpQkFBTyxTQUNSO1lBSG9CLFNBQUcsR0FBSCxHQUFHLENBQWlCO1lBQW1CLGVBQVMsR0FBVCxTQUFTLENBQXFCO1lBQ3JFLFdBQUssR0FBTCxLQUFLLENBQTZCO1lBSnZELGlCQUFXLEdBQThCLEVBQUUsQ0FBQzs7UUFNNUMsQ0FBQztRQUVRLCtCQUFLLEdBQWQsVUFBZSxJQUFxQixFQUFFLE9BQWE7O1lBQ2pELENBQUEsS0FBQSxJQUFJLENBQUMsV0FBVyxDQUFBLENBQUMsSUFBSSxvREFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUU7WUFDL0UsSUFB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QUFELENBQUMsQUF2RUQsQ0FBbUQsOEJBQW1CLEdBdUVyRSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgUmVjdXJzaXZlQXN0VmlzaXRvciwgVG1wbEFzdEJvdW5kQXR0cmlidXRlLCBUbXBsQXN0Qm91bmRFdmVudCwgVG1wbEFzdEJvdW5kVGV4dCwgVG1wbEFzdENvbnRlbnQsIFRtcGxBc3RFbGVtZW50LCBUbXBsQXN0SWN1LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFJlY3Vyc2l2ZVZpc2l0b3IsIFRtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFRleHQsIFRtcGxBc3RUZXh0QXR0cmlidXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7QVNUV2l0aFNvdXJjZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZX0gZnJvbSAnLi4vLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtOZ1RlbXBsYXRlRGlhZ25vc3RpYywgVGVtcGxhdGVUeXBlQ2hlY2tlcn0gZnJvbSAnLi4vLi4vYXBpJztcblxuLyoqXG4gKiBBIFRlbXBsYXRlIENoZWNrIHJlY2VpdmVzIGluZm9ybWF0aW9uIGFib3V0IHRoZSB0ZW1wbGF0ZSBpdCdzIGNoZWNraW5nIGFuZCByZXR1cm5zXG4gKiBpbmZvcm1hdGlvbiBhYm91dCB0aGUgZGlhZ25vc3RpY3MgdG8gYmUgZ2VuZXJhdGVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlQ2hlY2s8VCBleHRlbmRzIEVycm9yQ29kZT4ge1xuICAvKiogVW5pcXVlIHRlbXBsYXRlIGNoZWNrIGNvZGUsIHVzZWQgZm9yIGNvbmZpZ3VyYXRpb24gYW5kIHNlYXJjaGluZyB0aGUgZXJyb3IuICovXG4gIGNvZGU6IFQ7XG5cbiAgLyoqIFJ1bnMgY2hlY2sgYW5kIHJldHVybnMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGRpYWdub3N0aWNzIHRvIGJlIGdlbmVyYXRlZC4gKi9cbiAgcnVuKGN0eDogVGVtcGxhdGVDb250ZXh0LCBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24sXG4gICAgICB0ZW1wbGF0ZTogVG1wbEFzdE5vZGVbXSk6IE5nVGVtcGxhdGVEaWFnbm9zdGljPFQ+W107XG59XG5cbi8qKlxuICogVGhlIFRlbXBsYXRlQ29udGV4dCBwcm92aWRlZCB0byBhIFRlbXBsYXRlIENoZWNrIHRvIGdldCBkaWFnbm9zdGljIGluZm9ybWF0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlQ29udGV4dCB7XG4gIC8qKiBJbnRlcmZhY2UgdGhhdCBwcm92aWRlcyBpbmZvcm1hdGlvbiBhYm91dCB0ZW1wbGF0ZSBub2Rlcy4gKi9cbiAgdGVtcGxhdGVUeXBlQ2hlY2tlcjogVGVtcGxhdGVUeXBlQ2hlY2tlcjtcblxuICAvKipcbiAgICogVHlwZVNjcmlwdCBpbnRlcmZhY2UgdGhhdCBwcm92aWRlcyB0eXBlIGluZm9ybWF0aW9uIGFib3V0IHN5bWJvbHMgdGhhdCBhcHBlYXJcbiAgICogaW4gdGhlIHRlbXBsYXRlIChpdCBpcyBub3QgdG8gcXVlcnkgdHlwZXMgb3V0c2lkZSB0aGUgQW5ndWxhciBjb21wb25lbnQpLlxuICAgKi9cbiAgdHlwZUNoZWNrZXI6IHRzLlR5cGVDaGVja2VyO1xufVxuXG4vKipcbiAqIFRoaXMgYWJzdHJhY3QgY2xhc3MgcHJvdmlkZXMgYSBiYXNlIGltcGxlbWVudGF0aW9uIGZvciB0aGUgcnVuIG1ldGhvZC5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFRlbXBsYXRlQ2hlY2tXaXRoVmlzaXRvcjxUIGV4dGVuZHMgRXJyb3JDb2RlPiBpbXBsZW1lbnRzIFRlbXBsYXRlQ2hlY2s8VD4ge1xuICBhYnN0cmFjdCBjb2RlOiBUO1xuXG4gIC8qKlxuICAgKiBCYXNlIGltcGxlbWVudGF0aW9uIGZvciBydW4gZnVuY3Rpb24sIHZpc2l0cyBhbGwgbm9kZXMgaW4gdGVtcGxhdGUgYW5kIGNhbGxzXG4gICAqIGB2aXNpdE5vZGUoKWAgZm9yIGVhY2ggb25lLlxuICAgKi9cbiAgcnVuKGN0eDogVGVtcGxhdGVDb250ZXh0LCBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24sXG4gICAgICB0ZW1wbGF0ZTogVG1wbEFzdE5vZGVbXSk6IE5nVGVtcGxhdGVEaWFnbm9zdGljPFQ+W10ge1xuICAgIGNvbnN0IHZpc2l0b3IgPSBuZXcgVGVtcGxhdGVWaXNpdG9yPFQ+KGN0eCwgY29tcG9uZW50LCB0aGlzKTtcbiAgICByZXR1cm4gdmlzaXRvci5nZXREaWFnbm9zdGljcyh0ZW1wbGF0ZSk7XG4gIH1cblxuICAvKipcbiAgICogVmlzaXQgYSBUbXBsQXN0Tm9kZSBvciBBU1Qgbm9kZSBvZiB0aGUgdGVtcGxhdGUuIEF1dGhvcnMgc2hvdWxkIG92ZXJyaWRlIHRoaXNcbiAgICogbWV0aG9kIHRvIGltcGxlbWVudCB0aGUgY2hlY2sgYW5kIHJldHVybiBkaWFnbm9zdGljcy5cbiAgICovXG4gIGFic3RyYWN0IHZpc2l0Tm9kZShjdHg6IFRlbXBsYXRlQ29udGV4dCwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBub2RlOiBUbXBsQXN0Tm9kZXxBU1QpOlxuICAgICAgTmdUZW1wbGF0ZURpYWdub3N0aWM8VD5bXTtcbn1cblxuLyoqXG4gKiBWaXNpdHMgYWxsIG5vZGVzIGluIGEgdGVtcGxhdGUgKFRtcGxBc3ROb2RlIGFuZCBBU1QpIGFuZCBjYWxscyBgdmlzaXROb2RlYCBmb3IgZWFjaCBvbmUuXG4gKi9cbmNsYXNzIFRlbXBsYXRlVmlzaXRvcjxUIGV4dGVuZHMgRXJyb3JDb2RlPiBleHRlbmRzIFJlY3Vyc2l2ZUFzdFZpc2l0b3IgaW1wbGVtZW50c1xuICAgIFRtcGxBc3RSZWN1cnNpdmVWaXNpdG9yIHtcbiAgZGlhZ25vc3RpY3M6IE5nVGVtcGxhdGVEaWFnbm9zdGljPFQ+W10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY3R4OiBUZW1wbGF0ZUNvbnRleHQsIHByaXZhdGUgcmVhZG9ubHkgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBjaGVjazogVGVtcGxhdGVDaGVja1dpdGhWaXNpdG9yPFQ+KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHZpc2l0KG5vZGU6IEFTVHxUbXBsQXN0Tm9kZSwgY29udGV4dD86IGFueSkge1xuICAgIHRoaXMuZGlhZ25vc3RpY3MucHVzaCguLi50aGlzLmNoZWNrLnZpc2l0Tm9kZSh0aGlzLmN0eCwgdGhpcy5jb21wb25lbnQsIG5vZGUpKTtcbiAgICBub2RlLnZpc2l0KHRoaXMpO1xuICB9XG5cbiAgdmlzaXRBbGxOb2Rlcyhub2RlczogVG1wbEFzdE5vZGVbXSkge1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgdGhpcy52aXNpdChub2RlKTtcbiAgICB9XG4gIH1cblxuICB2aXNpdEFzdChhc3Q6IEFTVCkge1xuICAgIGlmIChhc3QgaW5zdGFuY2VvZiBBU1RXaXRoU291cmNlKSB7XG4gICAgICBhc3QgPSBhc3QuYXN0O1xuICAgIH1cbiAgICB0aGlzLnZpc2l0KGFzdCk7XG4gIH1cblxuICB2aXNpdEVsZW1lbnQoZWxlbWVudDogVG1wbEFzdEVsZW1lbnQpIHtcbiAgICB0aGlzLnZpc2l0QWxsTm9kZXMoZWxlbWVudC5hdHRyaWJ1dGVzKTtcbiAgICB0aGlzLnZpc2l0QWxsTm9kZXMoZWxlbWVudC5pbnB1dHMpO1xuICAgIHRoaXMudmlzaXRBbGxOb2RlcyhlbGVtZW50Lm91dHB1dHMpO1xuICAgIHRoaXMudmlzaXRBbGxOb2RlcyhlbGVtZW50LnJlZmVyZW5jZXMpO1xuICAgIHRoaXMudmlzaXRBbGxOb2RlcyhlbGVtZW50LmNoaWxkcmVuKTtcbiAgfVxuXG4gIHZpc2l0VGVtcGxhdGUodGVtcGxhdGU6IFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgIHRoaXMudmlzaXRBbGxOb2Rlcyh0ZW1wbGF0ZS5hdHRyaWJ1dGVzKTtcbiAgICBpZiAodGVtcGxhdGUudGFnTmFtZSA9PT0gJ25nLXRlbXBsYXRlJykge1xuICAgICAgLy8gT25seSB2aXNpdCBpbnB1dC9vdXRwdXRzL3RlbXBsYXRlQXR0cnMgaWYgdGhpcyBpc24ndCBhbiBpbmxpbmUgdGVtcGxhdGUgbm9kZVxuICAgICAgLy8gZ2VuZXJhdGVkIGZvciBhIHN0cnVjdHVyYWwgZGlyZWN0aXZlIChsaWtlIGA8ZGl2ICpuZ0lmPjwvZGl2PmApLiBUaGVzZSBub2Rlc1xuICAgICAgLy8gd291bGQgYmUgdmlzaXRlZCB3aGVuIHRoZSB1bmRlcmx5aW5nIGVsZW1lbnQgb2YgYW4gaW5saW5lIHRlbXBsYXRlIG5vZGUgaXMgcHJvY2Vzc2VkLlxuICAgICAgdGhpcy52aXNpdEFsbE5vZGVzKHRlbXBsYXRlLmlucHV0cyk7XG4gICAgICB0aGlzLnZpc2l0QWxsTm9kZXModGVtcGxhdGUub3V0cHV0cyk7XG4gICAgICB0aGlzLnZpc2l0QWxsTm9kZXModGVtcGxhdGUudGVtcGxhdGVBdHRycyk7XG4gICAgfVxuICAgIHRoaXMudmlzaXRBbGxOb2Rlcyh0ZW1wbGF0ZS52YXJpYWJsZXMpO1xuICAgIHRoaXMudmlzaXRBbGxOb2Rlcyh0ZW1wbGF0ZS5yZWZlcmVuY2VzKTtcbiAgICB0aGlzLnZpc2l0QWxsTm9kZXModGVtcGxhdGUuY2hpbGRyZW4pO1xuICB9XG4gIHZpc2l0Q29udGVudChjb250ZW50OiBUbXBsQXN0Q29udGVudCk6IHZvaWQge31cbiAgdmlzaXRWYXJpYWJsZSh2YXJpYWJsZTogVG1wbEFzdFZhcmlhYmxlKTogdm9pZCB7fVxuICB2aXNpdFJlZmVyZW5jZShyZWZlcmVuY2U6IFRtcGxBc3RSZWZlcmVuY2UpOiB2b2lkIHt9XG4gIHZpc2l0VGV4dEF0dHJpYnV0ZShhdHRyaWJ1dGU6IFRtcGxBc3RUZXh0QXR0cmlidXRlKTogdm9pZCB7fVxuICB2aXNpdEJvdW5kQXR0cmlidXRlKGF0dHJpYnV0ZTogVG1wbEFzdEJvdW5kQXR0cmlidXRlKTogdm9pZCB7XG4gICAgdGhpcy52aXNpdEFzdChhdHRyaWJ1dGUudmFsdWUpO1xuICB9XG4gIHZpc2l0Qm91bmRFdmVudChhdHRyaWJ1dGU6IFRtcGxBc3RCb3VuZEV2ZW50KTogdm9pZCB7XG4gICAgdGhpcy52aXNpdEFzdChhdHRyaWJ1dGUuaGFuZGxlcik7XG4gIH1cbiAgdmlzaXRUZXh0KHRleHQ6IFRtcGxBc3RUZXh0KTogdm9pZCB7fVxuICB2aXNpdEJvdW5kVGV4dCh0ZXh0OiBUbXBsQXN0Qm91bmRUZXh0KTogdm9pZCB7XG4gICAgdGhpcy52aXNpdEFzdCh0ZXh0LnZhbHVlKTtcbiAgfVxuICB2aXNpdEljdShpY3U6IFRtcGxBc3RJY3UpOiB2b2lkIHt9XG5cbiAgZ2V0RGlhZ25vc3RpY3ModGVtcGxhdGU6IFRtcGxBc3ROb2RlW10pOiBOZ1RlbXBsYXRlRGlhZ25vc3RpYzxUPltdIHtcbiAgICB0aGlzLmRpYWdub3N0aWNzID0gW107XG4gICAgdGhpcy52aXNpdEFsbE5vZGVzKHRlbXBsYXRlKTtcbiAgICByZXR1cm4gdGhpcy5kaWFnbm9zdGljcztcbiAgfVxufVxuIl19