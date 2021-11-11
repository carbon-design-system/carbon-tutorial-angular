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
        define("@angular/compiler-cli/src/ngtsc/diagnostics/src/util", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ngErrorCode = exports.replaceTsWithNgInErrors = void 0;
    var ERROR_CODE_MATCHER = /(\u001b\[\d+m ?)TS-99(\d+: ?\u001b\[\d+m)/g;
    /**
     * During formatting of `ts.Diagnostic`s, the numeric code of each diagnostic is prefixed with the
     * hard-coded "TS" prefix. For Angular's own error codes, a prefix of "NG" is desirable. To achieve
     * this, all Angular error codes start with "-99" so that the sequence "TS-99" can be assumed to
     * correspond with an Angular specific error code. This function replaces those occurrences with
     * just "NG".
     *
     * @param errors The formatted diagnostics
     */
    function replaceTsWithNgInErrors(errors) {
        return errors.replace(ERROR_CODE_MATCHER, '$1NG$2');
    }
    exports.replaceTsWithNgInErrors = replaceTsWithNgInErrors;
    function ngErrorCode(code) {
        return parseInt('-99' + code);
    }
    exports.ngErrorCode = ngErrorCode;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZGlhZ25vc3RpY3Mvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBSUgsSUFBTSxrQkFBa0IsR0FBRyw0Q0FBNEMsQ0FBQztJQUV4RTs7Ozs7Ozs7T0FRRztJQUNILFNBQWdCLHVCQUF1QixDQUFDLE1BQWM7UUFDcEQsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFGRCwwREFFQztJQUVELFNBQWdCLFdBQVcsQ0FBQyxJQUFlO1FBQ3pDLE9BQU8sUUFBUSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRkQsa0NBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFcnJvckNvZGV9IGZyb20gJy4vZXJyb3JfY29kZSc7XG5cbmNvbnN0IEVSUk9SX0NPREVfTUFUQ0hFUiA9IC8oXFx1MDAxYlxcW1xcZCttID8pVFMtOTkoXFxkKzogP1xcdTAwMWJcXFtcXGQrbSkvZztcblxuLyoqXG4gKiBEdXJpbmcgZm9ybWF0dGluZyBvZiBgdHMuRGlhZ25vc3RpY2BzLCB0aGUgbnVtZXJpYyBjb2RlIG9mIGVhY2ggZGlhZ25vc3RpYyBpcyBwcmVmaXhlZCB3aXRoIHRoZVxuICogaGFyZC1jb2RlZCBcIlRTXCIgcHJlZml4LiBGb3IgQW5ndWxhcidzIG93biBlcnJvciBjb2RlcywgYSBwcmVmaXggb2YgXCJOR1wiIGlzIGRlc2lyYWJsZS4gVG8gYWNoaWV2ZVxuICogdGhpcywgYWxsIEFuZ3VsYXIgZXJyb3IgY29kZXMgc3RhcnQgd2l0aCBcIi05OVwiIHNvIHRoYXQgdGhlIHNlcXVlbmNlIFwiVFMtOTlcIiBjYW4gYmUgYXNzdW1lZCB0b1xuICogY29ycmVzcG9uZCB3aXRoIGFuIEFuZ3VsYXIgc3BlY2lmaWMgZXJyb3IgY29kZS4gVGhpcyBmdW5jdGlvbiByZXBsYWNlcyB0aG9zZSBvY2N1cnJlbmNlcyB3aXRoXG4gKiBqdXN0IFwiTkdcIi5cbiAqXG4gKiBAcGFyYW0gZXJyb3JzIFRoZSBmb3JtYXR0ZWQgZGlhZ25vc3RpY3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlcGxhY2VUc1dpdGhOZ0luRXJyb3JzKGVycm9yczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVycm9ycy5yZXBsYWNlKEVSUk9SX0NPREVfTUFUQ0hFUiwgJyQxTkckMicpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbmdFcnJvckNvZGUoY29kZTogRXJyb3JDb2RlKTogbnVtYmVyIHtcbiAgcmV0dXJuIHBhcnNlSW50KCctOTknICsgY29kZSk7XG59XG4iXX0=