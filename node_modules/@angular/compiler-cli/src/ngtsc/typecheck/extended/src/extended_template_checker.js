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
        define("@angular/compiler-cli/src/ngtsc/typecheck/extended/src/extended_template_checker", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ExtendedTemplateCheckerImpl = void 0;
    var tslib_1 = require("tslib");
    var ExtendedTemplateCheckerImpl = /** @class */ (function () {
        function ExtendedTemplateCheckerImpl(templateTypeChecker, typeChecker, templateChecks) {
            this.templateChecks = templateChecks;
            this.ctx = { templateTypeChecker: templateTypeChecker, typeChecker: typeChecker };
        }
        ExtendedTemplateCheckerImpl.prototype.getDiagnosticsForComponent = function (component) {
            var e_1, _a;
            var template = this.ctx.templateTypeChecker.getTemplate(component);
            // Skip checks if component has no template. This can happen if the user writes a
            // `@Component()` but doesn't add the template, could happen in the language service
            // when users are in the middle of typing code.
            if (template === null) {
                return [];
            }
            var diagnostics = [];
            try {
                for (var _b = tslib_1.__values(this.templateChecks), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var check = _c.value;
                    diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(check.run(this.ctx, component, template))));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return diagnostics;
        };
        return ExtendedTemplateCheckerImpl;
    }());
    exports.ExtendedTemplateCheckerImpl = ExtendedTemplateCheckerImpl;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5kZWRfdGVtcGxhdGVfY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2V4dGVuZGVkL3NyYy9leHRlbmRlZF90ZW1wbGF0ZV9jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFRSDtRQUdFLHFDQUNJLG1CQUF3QyxFQUFFLFdBQTJCLEVBQ3BELGNBQTBDO1lBQTFDLG1CQUFjLEdBQWQsY0FBYyxDQUE0QjtZQUM3RCxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUMsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFDM0QsQ0FBQztRQUN0QixDQUFDO1FBRUQsZ0VBQTBCLEdBQTFCLFVBQTJCLFNBQThCOztZQUN2RCxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNyRSxpRkFBaUY7WUFDakYsb0ZBQW9GO1lBQ3BGLCtDQUErQztZQUMvQyxJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQ3JCLE9BQU8sRUFBRSxDQUFDO2FBQ1g7WUFDRCxJQUFNLFdBQVcsR0FBeUIsRUFBRSxDQUFDOztnQkFFN0MsS0FBb0IsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxjQUFjLENBQUEsZ0JBQUEsNEJBQUU7b0JBQXBDLElBQU0sS0FBSyxXQUFBO29CQUNkLFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsMkNBQVMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsSUFBRTtpQkFDL0Q7Ozs7Ozs7OztZQUVELE9BQU8sV0FBVyxDQUFDO1FBQ3JCLENBQUM7UUFDSCxrQ0FBQztJQUFELENBQUMsQUExQkQsSUEwQkM7SUExQlksa0VBQTJCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZX0gZnJvbSAnLi4vLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtUZW1wbGF0ZURpYWdub3N0aWMsIFRlbXBsYXRlVHlwZUNoZWNrZXJ9IGZyb20gJy4uLy4uL2FwaSc7XG5pbXBvcnQge0V4dGVuZGVkVGVtcGxhdGVDaGVja2VyLCBUZW1wbGF0ZUNoZWNrLCBUZW1wbGF0ZUNvbnRleHR9IGZyb20gJy4uL2FwaSc7XG5cbmV4cG9ydCBjbGFzcyBFeHRlbmRlZFRlbXBsYXRlQ2hlY2tlckltcGwgaW1wbGVtZW50cyBFeHRlbmRlZFRlbXBsYXRlQ2hlY2tlciB7XG4gIHByaXZhdGUgY3R4OiBUZW1wbGF0ZUNvbnRleHQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICB0ZW1wbGF0ZVR5cGVDaGVja2VyOiBUZW1wbGF0ZVR5cGVDaGVja2VyLCB0eXBlQ2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRlbXBsYXRlQ2hlY2tzOiBUZW1wbGF0ZUNoZWNrPEVycm9yQ29kZT5bXSkge1xuICAgIHRoaXMuY3R4ID0ge3RlbXBsYXRlVHlwZUNoZWNrZXI6IHRlbXBsYXRlVHlwZUNoZWNrZXIsIHR5cGVDaGVja2VyOiB0eXBlQ2hlY2tlcn0gYXNcbiAgICAgICAgVGVtcGxhdGVDb250ZXh0O1xuICB9XG5cbiAgZ2V0RGlhZ25vc3RpY3NGb3JDb21wb25lbnQoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogVGVtcGxhdGVEaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5jdHgudGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRUZW1wbGF0ZShjb21wb25lbnQpO1xuICAgIC8vIFNraXAgY2hlY2tzIGlmIGNvbXBvbmVudCBoYXMgbm8gdGVtcGxhdGUuIFRoaXMgY2FuIGhhcHBlbiBpZiB0aGUgdXNlciB3cml0ZXMgYVxuICAgIC8vIGBAQ29tcG9uZW50KClgIGJ1dCBkb2Vzbid0IGFkZCB0aGUgdGVtcGxhdGUsIGNvdWxkIGhhcHBlbiBpbiB0aGUgbGFuZ3VhZ2Ugc2VydmljZVxuICAgIC8vIHdoZW4gdXNlcnMgYXJlIGluIHRoZSBtaWRkbGUgb2YgdHlwaW5nIGNvZGUuXG4gICAgaWYgKHRlbXBsYXRlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiBUZW1wbGF0ZURpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBjaGVjayBvZiB0aGlzLnRlbXBsYXRlQ2hlY2tzKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmNoZWNrLnJ1bih0aGlzLmN0eCwgY29tcG9uZW50LCB0ZW1wbGF0ZSkpO1xuICAgIH1cblxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxufVxuIl19