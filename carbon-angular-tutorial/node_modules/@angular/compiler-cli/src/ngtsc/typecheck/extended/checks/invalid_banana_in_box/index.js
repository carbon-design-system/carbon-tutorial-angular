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
        define("@angular/compiler-cli/src/ngtsc/typecheck/extended/checks/invalid_banana_in_box", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/extended/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InvalidBananaInBoxCheck = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/extended/api");
    /**
     * Ensures the two-way binding syntax is correct.
     * Parentheses should be inside the brackets "[()]".
     * Will return diagnostic information when "([])" is found.
     */
    var InvalidBananaInBoxCheck = /** @class */ (function (_super) {
        tslib_1.__extends(InvalidBananaInBoxCheck, _super);
        function InvalidBananaInBoxCheck() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.code = diagnostics_1.ErrorCode.INVALID_BANANA_IN_BOX;
            return _this;
        }
        InvalidBananaInBoxCheck.prototype.visitNode = function (ctx, component, node) {
            if (!(node instanceof compiler_1.TmplAstBoundEvent))
                return [];
            var name = node.name;
            if (!name.startsWith('[') || !name.endsWith(']'))
                return [];
            var boundSyntax = node.sourceSpan.toString();
            var expectedBoundSyntax = boundSyntax.replace("(" + name + ")", "[(" + name.slice(1, -1) + ")]");
            var diagnostic = ctx.templateTypeChecker.makeTemplateDiagnostic(component, node.sourceSpan, ts.DiagnosticCategory.Warning, diagnostics_1.ErrorCode.INVALID_BANANA_IN_BOX, "In the two-way binding syntax the parentheses should be inside the brackets, ex. '" + expectedBoundSyntax + "'. \n        Find more at https://angular.io/guide/two-way-binding");
            return [diagnostic];
        };
        return InvalidBananaInBoxCheck;
    }(api_1.TemplateCheckWithVisitor));
    exports.InvalidBananaInBoxCheck = InvalidBananaInBoxCheck;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9leHRlbmRlZC9jaGVja3MvaW52YWxpZF9iYW5hbmFfaW5fYm94L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBc0U7SUFDdEUsK0JBQWlDO0lBRWpDLDJFQUFrRDtJQUVsRCw4RUFBb0U7SUFFcEU7Ozs7T0FJRztJQUNIO1FBQ0ksbURBQXlEO1FBRDdEO1lBQUEscUVBb0JDO1lBbEJVLFVBQUksR0FBRyx1QkFBUyxDQUFDLHFCQUE4QixDQUFDOztRQWtCM0QsQ0FBQztRQWhCVSwyQ0FBUyxHQUFsQixVQUFtQixHQUFvQixFQUFFLFNBQThCLEVBQUUsSUFBcUI7WUFFNUYsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLDRCQUFpQixDQUFDO2dCQUFFLE9BQU8sRUFBRSxDQUFDO1lBRXBELElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztnQkFBRSxPQUFPLEVBQUUsQ0FBQztZQUU1RCxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQy9DLElBQU0sbUJBQW1CLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFJLElBQUksTUFBRyxFQUFFLE9BQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBSSxDQUFDLENBQUM7WUFDekYsSUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLG1CQUFtQixDQUFDLHNCQUFzQixDQUM3RCxTQUFTLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLHVCQUFTLENBQUMscUJBQXFCLEVBQzFGLHVGQUNJLG1CQUFtQix1RUFDK0IsQ0FBQyxDQUFDO1lBQzVELE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN0QixDQUFDO1FBQ0gsOEJBQUM7SUFBRCxDQUFDLEFBcEJELENBQ0ksOEJBQXdCLEdBbUIzQjtJQXBCWSwwREFBdUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIFRtcGxBc3RCb3VuZEV2ZW50LCBUbXBsQXN0Tm9kZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlfSBmcm9tICcuLi8uLi8uLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge05nVGVtcGxhdGVEaWFnbm9zdGljfSBmcm9tICcuLi8uLi8uLi9hcGknO1xuaW1wb3J0IHtUZW1wbGF0ZUNoZWNrV2l0aFZpc2l0b3IsIFRlbXBsYXRlQ29udGV4dH0gZnJvbSAnLi4vLi4vYXBpJztcblxuLyoqXG4gKiBFbnN1cmVzIHRoZSB0d28td2F5IGJpbmRpbmcgc3ludGF4IGlzIGNvcnJlY3QuXG4gKiBQYXJlbnRoZXNlcyBzaG91bGQgYmUgaW5zaWRlIHRoZSBicmFja2V0cyBcIlsoKV1cIi5cbiAqIFdpbGwgcmV0dXJuIGRpYWdub3N0aWMgaW5mb3JtYXRpb24gd2hlbiBcIihbXSlcIiBpcyBmb3VuZC5cbiAqL1xuZXhwb3J0IGNsYXNzIEludmFsaWRCYW5hbmFJbkJveENoZWNrIGV4dGVuZHNcbiAgICBUZW1wbGF0ZUNoZWNrV2l0aFZpc2l0b3I8RXJyb3JDb2RlLklOVkFMSURfQkFOQU5BX0lOX0JPWD4ge1xuICBvdmVycmlkZSBjb2RlID0gRXJyb3JDb2RlLklOVkFMSURfQkFOQU5BX0lOX0JPWCBhcyBjb25zdDtcblxuICBvdmVycmlkZSB2aXNpdE5vZGUoY3R4OiBUZW1wbGF0ZUNvbnRleHQsIGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgbm9kZTogVG1wbEFzdE5vZGV8QVNUKTpcbiAgICAgIE5nVGVtcGxhdGVEaWFnbm9zdGljPEVycm9yQ29kZS5JTlZBTElEX0JBTkFOQV9JTl9CT1g+W10ge1xuICAgIGlmICghKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRFdmVudCkpIHJldHVybiBbXTtcblxuICAgIGNvbnN0IG5hbWUgPSBub2RlLm5hbWU7XG4gICAgaWYgKCFuYW1lLnN0YXJ0c1dpdGgoJ1snKSB8fCAhbmFtZS5lbmRzV2l0aCgnXScpKSByZXR1cm4gW107XG5cbiAgICBjb25zdCBib3VuZFN5bnRheCA9IG5vZGUuc291cmNlU3Bhbi50b1N0cmluZygpO1xuICAgIGNvbnN0IGV4cGVjdGVkQm91bmRTeW50YXggPSBib3VuZFN5bnRheC5yZXBsYWNlKGAoJHtuYW1lfSlgLCBgWygke25hbWUuc2xpY2UoMSwgLTEpfSldYCk7XG4gICAgY29uc3QgZGlhZ25vc3RpYyA9IGN0eC50ZW1wbGF0ZVR5cGVDaGVja2VyLm1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICAgIGNvbXBvbmVudCwgbm9kZS5zb3VyY2VTcGFuLCB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuV2FybmluZywgRXJyb3JDb2RlLklOVkFMSURfQkFOQU5BX0lOX0JPWCxcbiAgICAgICAgYEluIHRoZSB0d28td2F5IGJpbmRpbmcgc3ludGF4IHRoZSBwYXJlbnRoZXNlcyBzaG91bGQgYmUgaW5zaWRlIHRoZSBicmFja2V0cywgZXguICcke1xuICAgICAgICAgICAgZXhwZWN0ZWRCb3VuZFN5bnRheH0nLiBcbiAgICAgICAgRmluZCBtb3JlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9ndWlkZS90d28td2F5LWJpbmRpbmdgKTtcbiAgICByZXR1cm4gW2RpYWdub3N0aWNdO1xuICB9XG59XG4iXX0=