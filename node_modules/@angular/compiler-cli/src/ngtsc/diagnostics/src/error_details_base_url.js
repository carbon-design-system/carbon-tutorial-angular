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
        define("@angular/compiler-cli/src/ngtsc/diagnostics/src/error_details_base_url", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ERROR_DETAILS_PAGE_BASE_URL = void 0;
    /**
     * Base URL for the error details page.
     *
     * Keep the files below in sync:
     *  - packages/compiler-cli/src/ngtsc/diagnostics/src/error_details_base_url.ts
     *  - packages/core/src/render3/error_details_base_url.ts
     */
    exports.ERROR_DETAILS_PAGE_BASE_URL = 'https://angular.io/errors';
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JfZGV0YWlsc19iYXNlX3VybC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZGlhZ25vc3RpY3Mvc3JjL2Vycm9yX2RldGFpbHNfYmFzZV91cmwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUg7Ozs7OztPQU1HO0lBQ1UsUUFBQSwyQkFBMkIsR0FBRywyQkFBMkIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vKipcbiAqIEJhc2UgVVJMIGZvciB0aGUgZXJyb3IgZGV0YWlscyBwYWdlLlxuICpcbiAqIEtlZXAgdGhlIGZpbGVzIGJlbG93IGluIHN5bmM6XG4gKiAgLSBwYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2RpYWdub3N0aWNzL3NyYy9lcnJvcl9kZXRhaWxzX2Jhc2VfdXJsLnRzXG4gKiAgLSBwYWNrYWdlcy9jb3JlL3NyYy9yZW5kZXIzL2Vycm9yX2RldGFpbHNfYmFzZV91cmwudHNcbiAqL1xuZXhwb3J0IGNvbnN0IEVSUk9SX0RFVEFJTFNfUEFHRV9CQVNFX1VSTCA9ICdodHRwczovL2FuZ3VsYXIuaW8vZXJyb3JzJztcbiJdfQ==