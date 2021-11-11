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
        define("@angular/compiler-cli/src/ngtsc/diagnostics", ["require", "exports", "@angular/compiler-cli/src/ngtsc/diagnostics/src/docs", "@angular/compiler-cli/src/ngtsc/diagnostics/src/error", "@angular/compiler-cli/src/ngtsc/diagnostics/src/error_code", "@angular/compiler-cli/src/ngtsc/diagnostics/src/error_details_base_url", "@angular/compiler-cli/src/ngtsc/diagnostics/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.replaceTsWithNgInErrors = exports.ngErrorCode = exports.ERROR_DETAILS_PAGE_BASE_URL = exports.ErrorCode = exports.makeRelatedInformation = exports.makeDiagnostic = exports.isFatalDiagnosticError = exports.FatalDiagnosticError = exports.COMPILER_ERRORS_WITH_GUIDES = void 0;
    var docs_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics/src/docs");
    Object.defineProperty(exports, "COMPILER_ERRORS_WITH_GUIDES", { enumerable: true, get: function () { return docs_1.COMPILER_ERRORS_WITH_GUIDES; } });
    var error_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics/src/error");
    Object.defineProperty(exports, "FatalDiagnosticError", { enumerable: true, get: function () { return error_1.FatalDiagnosticError; } });
    Object.defineProperty(exports, "isFatalDiagnosticError", { enumerable: true, get: function () { return error_1.isFatalDiagnosticError; } });
    Object.defineProperty(exports, "makeDiagnostic", { enumerable: true, get: function () { return error_1.makeDiagnostic; } });
    Object.defineProperty(exports, "makeRelatedInformation", { enumerable: true, get: function () { return error_1.makeRelatedInformation; } });
    var error_code_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics/src/error_code");
    Object.defineProperty(exports, "ErrorCode", { enumerable: true, get: function () { return error_code_1.ErrorCode; } });
    var error_details_base_url_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics/src/error_details_base_url");
    Object.defineProperty(exports, "ERROR_DETAILS_PAGE_BASE_URL", { enumerable: true, get: function () { return error_details_base_url_1.ERROR_DETAILS_PAGE_BASE_URL; } });
    var util_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics/src/util");
    Object.defineProperty(exports, "ngErrorCode", { enumerable: true, get: function () { return util_1.ngErrorCode; } });
    Object.defineProperty(exports, "replaceTsWithNgInErrors", { enumerable: true, get: function () { return util_1.replaceTsWithNgInErrors; } });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2RpYWdub3N0aWNzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDZFQUF1RDtJQUEvQyxtSEFBQSwyQkFBMkIsT0FBQTtJQUNuQywrRUFBaUg7SUFBekcsNkdBQUEsb0JBQW9CLE9BQUE7SUFBRSwrR0FBQSxzQkFBc0IsT0FBQTtJQUFFLHVHQUFBLGNBQWMsT0FBQTtJQUFFLCtHQUFBLHNCQUFzQixPQUFBO0lBQzVGLHlGQUEyQztJQUFuQyx1R0FBQSxTQUFTLE9BQUE7SUFDakIsaUhBQXlFO0lBQWpFLHFJQUFBLDJCQUEyQixPQUFBO0lBQ25DLDZFQUFnRTtJQUF4RCxtR0FBQSxXQUFXLE9BQUE7SUFBRSwrR0FBQSx1QkFBdUIsT0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5leHBvcnQge0NPTVBJTEVSX0VSUk9SU19XSVRIX0dVSURFU30gZnJvbSAnLi9zcmMvZG9jcyc7XG5leHBvcnQge0ZhdGFsRGlhZ25vc3RpY0Vycm9yLCBpc0ZhdGFsRGlhZ25vc3RpY0Vycm9yLCBtYWtlRGlhZ25vc3RpYywgbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbn0gZnJvbSAnLi9zcmMvZXJyb3InO1xuZXhwb3J0IHtFcnJvckNvZGV9IGZyb20gJy4vc3JjL2Vycm9yX2NvZGUnO1xuZXhwb3J0IHtFUlJPUl9ERVRBSUxTX1BBR0VfQkFTRV9VUkx9IGZyb20gJy4vc3JjL2Vycm9yX2RldGFpbHNfYmFzZV91cmwnO1xuZXhwb3J0IHtuZ0Vycm9yQ29kZSwgcmVwbGFjZVRzV2l0aE5nSW5FcnJvcnN9IGZyb20gJy4vc3JjL3V0aWwnO1xuIl19