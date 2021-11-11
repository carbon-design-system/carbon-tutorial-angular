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
        define("@angular/compiler-cli/src/ngtsc/typecheck/extended/api/extended_template_checker", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5kZWRfdGVtcGxhdGVfY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2V4dGVuZGVkL2FwaS9leHRlbmRlZF90ZW1wbGF0ZV9jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7VGVtcGxhdGVEaWFnbm9zdGljfSBmcm9tICcuLi8uLi9hcGknO1xuXG4vKipcbiAqIEludGVyZmFjZSB0byBnZW5lcmF0ZSBleHRlbmRlZCB0ZW1wbGF0ZSBkaWFuZ29zdGljcyBmcm9tIHRoZSBjb21wb25lbnQgdGVtcGFsdGVzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEV4dGVuZGVkVGVtcGxhdGVDaGVja2VyIHtcbiAgLyoqXG4gICAqIFJ1biBgVGVtcGxhdGVDaGVja2BzIGZvciBhIGNvbXBvbmVudCBhbmQgcmV0dXJuIHRoZSBnZW5lcmF0ZWQgYHRzLkRpYWdub3N0aWNgcy5cbiAgICovXG4gIGdldERpYWdub3N0aWNzRm9yQ29tcG9uZW50KGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFRlbXBsYXRlRGlhZ25vc3RpY1tdO1xufVxuIl19