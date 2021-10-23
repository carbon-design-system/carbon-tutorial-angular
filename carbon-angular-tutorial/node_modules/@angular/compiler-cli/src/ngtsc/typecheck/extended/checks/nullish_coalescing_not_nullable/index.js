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
        define("@angular/compiler-cli/src/ngtsc/typecheck/extended/checks/nullish_coalescing_not_nullable", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/extended/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NullishCoalescingNotNullableCheck = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var api_2 = require("@angular/compiler-cli/src/ngtsc/typecheck/extended/api");
    /**
     * Ensures the left side of a nullish coalescing operation is nullable.
     * Returns diagnostics for the cases where the operator is useless.
     * This check should only be use if `strictNullChecks` is enabled,
     * otherwise it would produce inaccurate results.
     */
    var NullishCoalescingNotNullableCheck = /** @class */ (function (_super) {
        tslib_1.__extends(NullishCoalescingNotNullableCheck, _super);
        function NullishCoalescingNotNullableCheck() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.code = diagnostics_1.ErrorCode.NULLISH_COALESCING_NOT_NULLABLE;
            return _this;
        }
        NullishCoalescingNotNullableCheck.prototype.visitNode = function (ctx, component, node) {
            if (!(node instanceof compiler_1.Binary) || node.operation !== '??')
                return [];
            var symbolLeft = ctx.templateTypeChecker.getSymbolOfNode(node.left, component);
            if (symbolLeft === null || symbolLeft.kind !== api_1.SymbolKind.Expression) {
                return [];
            }
            var typeLeft = symbolLeft.tsType;
            // If the left operand's type is different from its non-nullable self, then it must
            // contain a null or undefined so this nullish coalescing operator is useful. No diagnostic to
            // report.
            if (typeLeft.getNonNullableType() !== typeLeft)
                return [];
            var symbol = ctx.templateTypeChecker.getSymbolOfNode(node, component);
            if (symbol.kind !== api_1.SymbolKind.Expression) {
                return [];
            }
            var span = ctx.templateTypeChecker.getTemplateMappingAtShimLocation(symbol.shimLocation).span;
            var diagnostic = ctx.templateTypeChecker.makeTemplateDiagnostic(component, span, ts.DiagnosticCategory.Warning, diagnostics_1.ErrorCode.NULLISH_COALESCING_NOT_NULLABLE, "The left side of this nullish coalescing operation does not include 'null' or 'undefined' in its type, therefore the '??' operator can be safely removed.");
            return [diagnostic];
        };
        return NullishCoalescingNotNullableCheck;
    }(api_2.TemplateCheckWithVisitor));
    exports.NullishCoalescingNotNullableCheck = NullishCoalescingNotNullableCheck;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9leHRlbmRlZC9jaGVja3MvbnVsbGlzaF9jb2FsZXNjaW5nX25vdF9udWxsYWJsZS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTJEO0lBQzNELCtCQUFpQztJQUVqQywyRUFBa0Q7SUFDbEQscUVBQThEO0lBQzlELDhFQUFvRTtJQUVwRTs7Ozs7T0FLRztJQUNIO1FBQ0ksNkRBQW1FO1FBRHZFO1lBQUEscUVBNkJDO1lBM0JVLFVBQUksR0FBRyx1QkFBUyxDQUFDLCtCQUF3QyxDQUFDOztRQTJCckUsQ0FBQztRQXpCVSxxREFBUyxHQUFsQixVQUFtQixHQUFvQixFQUFFLFNBQThCLEVBQUUsSUFBcUI7WUFFNUYsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLGlCQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLElBQUk7Z0JBQUUsT0FBTyxFQUFFLENBQUM7WUFFcEUsSUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ2pGLElBQUksVUFBVSxLQUFLLElBQUksSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLGdCQUFVLENBQUMsVUFBVSxFQUFFO2dCQUNwRSxPQUFPLEVBQUUsQ0FBQzthQUNYO1lBQ0QsSUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQztZQUNuQyxtRkFBbUY7WUFDbkYsOEZBQThGO1lBQzlGLFVBQVU7WUFDVixJQUFJLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLFFBQVE7Z0JBQUUsT0FBTyxFQUFFLENBQUM7WUFFMUQsSUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFFLENBQUM7WUFDekUsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLGdCQUFVLENBQUMsVUFBVSxFQUFFO2dCQUN6QyxPQUFPLEVBQUUsQ0FBQzthQUNYO1lBQ0QsSUFBTSxJQUFJLEdBQ04sR0FBRyxDQUFDLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUUsQ0FBQyxJQUFJLENBQUM7WUFDeEYsSUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLG1CQUFtQixDQUFDLHNCQUFzQixDQUM3RCxTQUFTLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsdUJBQVMsQ0FBQywrQkFBK0IsRUFDekYsMkpBQTJKLENBQUMsQ0FBQztZQUNqSyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdEIsQ0FBQztRQUNILHdDQUFDO0lBQUQsQ0FBQyxBQTdCRCxDQUNJLDhCQUF3QixHQTRCM0I7SUE3QlksOEVBQWlDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBCaW5hcnksIFRtcGxBc3ROb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGV9IGZyb20gJy4uLy4uLy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7TmdUZW1wbGF0ZURpYWdub3N0aWMsIFN5bWJvbEtpbmR9IGZyb20gJy4uLy4uLy4uL2FwaSc7XG5pbXBvcnQge1RlbXBsYXRlQ2hlY2tXaXRoVmlzaXRvciwgVGVtcGxhdGVDb250ZXh0fSBmcm9tICcuLi8uLi9hcGknO1xuXG4vKipcbiAqIEVuc3VyZXMgdGhlIGxlZnQgc2lkZSBvZiBhIG51bGxpc2ggY29hbGVzY2luZyBvcGVyYXRpb24gaXMgbnVsbGFibGUuXG4gKiBSZXR1cm5zIGRpYWdub3N0aWNzIGZvciB0aGUgY2FzZXMgd2hlcmUgdGhlIG9wZXJhdG9yIGlzIHVzZWxlc3MuXG4gKiBUaGlzIGNoZWNrIHNob3VsZCBvbmx5IGJlIHVzZSBpZiBgc3RyaWN0TnVsbENoZWNrc2AgaXMgZW5hYmxlZCxcbiAqIG90aGVyd2lzZSBpdCB3b3VsZCBwcm9kdWNlIGluYWNjdXJhdGUgcmVzdWx0cy5cbiAqL1xuZXhwb3J0IGNsYXNzIE51bGxpc2hDb2FsZXNjaW5nTm90TnVsbGFibGVDaGVjayBleHRlbmRzXG4gICAgVGVtcGxhdGVDaGVja1dpdGhWaXNpdG9yPEVycm9yQ29kZS5OVUxMSVNIX0NPQUxFU0NJTkdfTk9UX05VTExBQkxFPiB7XG4gIG92ZXJyaWRlIGNvZGUgPSBFcnJvckNvZGUuTlVMTElTSF9DT0FMRVNDSU5HX05PVF9OVUxMQUJMRSBhcyBjb25zdDtcblxuICBvdmVycmlkZSB2aXNpdE5vZGUoY3R4OiBUZW1wbGF0ZUNvbnRleHQsIGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgbm9kZTogVG1wbEFzdE5vZGV8QVNUKTpcbiAgICAgIE5nVGVtcGxhdGVEaWFnbm9zdGljPEVycm9yQ29kZS5OVUxMSVNIX0NPQUxFU0NJTkdfTk9UX05VTExBQkxFPltdIHtcbiAgICBpZiAoIShub2RlIGluc3RhbmNlb2YgQmluYXJ5KSB8fCBub2RlLm9wZXJhdGlvbiAhPT0gJz8/JykgcmV0dXJuIFtdO1xuXG4gICAgY29uc3Qgc3ltYm9sTGVmdCA9IGN0eC50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldFN5bWJvbE9mTm9kZShub2RlLmxlZnQsIGNvbXBvbmVudCk7XG4gICAgaWYgKHN5bWJvbExlZnQgPT09IG51bGwgfHwgc3ltYm9sTGVmdC5raW5kICE9PSBTeW1ib2xLaW5kLkV4cHJlc3Npb24pIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgdHlwZUxlZnQgPSBzeW1ib2xMZWZ0LnRzVHlwZTtcbiAgICAvLyBJZiB0aGUgbGVmdCBvcGVyYW5kJ3MgdHlwZSBpcyBkaWZmZXJlbnQgZnJvbSBpdHMgbm9uLW51bGxhYmxlIHNlbGYsIHRoZW4gaXQgbXVzdFxuICAgIC8vIGNvbnRhaW4gYSBudWxsIG9yIHVuZGVmaW5lZCBzbyB0aGlzIG51bGxpc2ggY29hbGVzY2luZyBvcGVyYXRvciBpcyB1c2VmdWwuIE5vIGRpYWdub3N0aWMgdG9cbiAgICAvLyByZXBvcnQuXG4gICAgaWYgKHR5cGVMZWZ0LmdldE5vbk51bGxhYmxlVHlwZSgpICE9PSB0eXBlTGVmdCkgcmV0dXJuIFtdO1xuXG4gICAgY29uc3Qgc3ltYm9sID0gY3R4LnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0U3ltYm9sT2ZOb2RlKG5vZGUsIGNvbXBvbmVudCkhO1xuICAgIGlmIChzeW1ib2wua2luZCAhPT0gU3ltYm9sS2luZC5FeHByZXNzaW9uKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IHNwYW4gPVxuICAgICAgICBjdHgudGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRUZW1wbGF0ZU1hcHBpbmdBdFNoaW1Mb2NhdGlvbihzeW1ib2wuc2hpbUxvY2F0aW9uKSEuc3BhbjtcbiAgICBjb25zdCBkaWFnbm9zdGljID0gY3R4LnRlbXBsYXRlVHlwZUNoZWNrZXIubWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICAgICAgY29tcG9uZW50LCBzcGFuLCB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuV2FybmluZywgRXJyb3JDb2RlLk5VTExJU0hfQ09BTEVTQ0lOR19OT1RfTlVMTEFCTEUsXG4gICAgICAgIGBUaGUgbGVmdCBzaWRlIG9mIHRoaXMgbnVsbGlzaCBjb2FsZXNjaW5nIG9wZXJhdGlvbiBkb2VzIG5vdCBpbmNsdWRlICdudWxsJyBvciAndW5kZWZpbmVkJyBpbiBpdHMgdHlwZSwgdGhlcmVmb3JlIHRoZSAnPz8nIG9wZXJhdG9yIGNhbiBiZSBzYWZlbHkgcmVtb3ZlZC5gKTtcbiAgICByZXR1cm4gW2RpYWdub3N0aWNdO1xuICB9XG59XG4iXX0=