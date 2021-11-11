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
        define("@angular/compiler-cli/src/ngtsc/diagnostics/src/docs", ["require", "exports", "@angular/compiler-cli/src/ngtsc/diagnostics/src/error_code"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.COMPILER_ERRORS_WITH_GUIDES = void 0;
    var error_code_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics/src/error_code");
    /**
     * Contains a set of error messages that have detailed guides at angular.io.
     * Full list of available error guides can be found at https://angular.io/errors
     */
    exports.COMPILER_ERRORS_WITH_GUIDES = new Set([
        error_code_1.ErrorCode.DECORATOR_ARG_NOT_LITERAL,
        error_code_1.ErrorCode.IMPORT_CYCLE_DETECTED,
        error_code_1.ErrorCode.PARAM_MISSING_TOKEN,
        error_code_1.ErrorCode.SCHEMA_INVALID_ELEMENT,
        error_code_1.ErrorCode.SCHEMA_INVALID_ATTRIBUTE,
        error_code_1.ErrorCode.MISSING_REFERENCE_TARGET,
        error_code_1.ErrorCode.COMPONENT_INVALID_SHADOW_DOM_SELECTOR,
    ]);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZGlhZ25vc3RpY3Mvc3JjL2RvY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgseUZBQXVDO0lBRXZDOzs7T0FHRztJQUNVLFFBQUEsMkJBQTJCLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDakQsc0JBQVMsQ0FBQyx5QkFBeUI7UUFDbkMsc0JBQVMsQ0FBQyxxQkFBcUI7UUFDL0Isc0JBQVMsQ0FBQyxtQkFBbUI7UUFDN0Isc0JBQVMsQ0FBQyxzQkFBc0I7UUFDaEMsc0JBQVMsQ0FBQyx3QkFBd0I7UUFDbEMsc0JBQVMsQ0FBQyx3QkFBd0I7UUFDbEMsc0JBQVMsQ0FBQyxxQ0FBcUM7S0FDaEQsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXJyb3JDb2RlfSBmcm9tICcuL2Vycm9yX2NvZGUnO1xuXG4vKipcbiAqIENvbnRhaW5zIGEgc2V0IG9mIGVycm9yIG1lc3NhZ2VzIHRoYXQgaGF2ZSBkZXRhaWxlZCBndWlkZXMgYXQgYW5ndWxhci5pby5cbiAqIEZ1bGwgbGlzdCBvZiBhdmFpbGFibGUgZXJyb3IgZ3VpZGVzIGNhbiBiZSBmb3VuZCBhdCBodHRwczovL2FuZ3VsYXIuaW8vZXJyb3JzXG4gKi9cbmV4cG9ydCBjb25zdCBDT01QSUxFUl9FUlJPUlNfV0lUSF9HVUlERVMgPSBuZXcgU2V0KFtcbiAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsXG4gIEVycm9yQ29kZS5JTVBPUlRfQ1lDTEVfREVURUNURUQsXG4gIEVycm9yQ29kZS5QQVJBTV9NSVNTSU5HX1RPS0VOLFxuICBFcnJvckNvZGUuU0NIRU1BX0lOVkFMSURfRUxFTUVOVCxcbiAgRXJyb3JDb2RlLlNDSEVNQV9JTlZBTElEX0FUVFJJQlVURSxcbiAgRXJyb3JDb2RlLk1JU1NJTkdfUkVGRVJFTkNFX1RBUkdFVCxcbiAgRXJyb3JDb2RlLkNPTVBPTkVOVF9JTlZBTElEX1NIQURPV19ET01fU0VMRUNUT1IsXG5dKTtcbiJdfQ==