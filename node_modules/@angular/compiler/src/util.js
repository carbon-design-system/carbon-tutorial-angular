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
        define("@angular/compiler/src/util", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.partitionArray = exports.newArray = exports.global = exports.Version = exports.isPromise = exports.resolveForwardRef = exports.stringify = exports.utf8Encode = exports.escapeRegExp = exports.error = exports.SyncAsync = exports.ValueTransformer = exports.noUndefined = exports.isDefined = exports.visitValue = exports.splitAtPeriod = exports.splitAtColon = exports.dashCaseToCamelCase = void 0;
    var tslib_1 = require("tslib");
    var DASH_CASE_REGEXP = /-+([a-z0-9])/g;
    function dashCaseToCamelCase(input) {
        return input.replace(DASH_CASE_REGEXP, function () {
            var m = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                m[_i] = arguments[_i];
            }
            return m[1].toUpperCase();
        });
    }
    exports.dashCaseToCamelCase = dashCaseToCamelCase;
    function splitAtColon(input, defaultValues) {
        return _splitAt(input, ':', defaultValues);
    }
    exports.splitAtColon = splitAtColon;
    function splitAtPeriod(input, defaultValues) {
        return _splitAt(input, '.', defaultValues);
    }
    exports.splitAtPeriod = splitAtPeriod;
    function _splitAt(input, character, defaultValues) {
        var characterIndex = input.indexOf(character);
        if (characterIndex == -1)
            return defaultValues;
        return [input.slice(0, characterIndex).trim(), input.slice(characterIndex + 1).trim()];
    }
    function visitValue(value, visitor, context) {
        if (Array.isArray(value)) {
            return visitor.visitArray(value, context);
        }
        if (isStrictStringMap(value)) {
            return visitor.visitStringMap(value, context);
        }
        if (value == null || typeof value == 'string' || typeof value == 'number' ||
            typeof value == 'boolean') {
            return visitor.visitPrimitive(value, context);
        }
        return visitor.visitOther(value, context);
    }
    exports.visitValue = visitValue;
    function isDefined(val) {
        return val !== null && val !== undefined;
    }
    exports.isDefined = isDefined;
    function noUndefined(val) {
        return val === undefined ? null : val;
    }
    exports.noUndefined = noUndefined;
    var ValueTransformer = /** @class */ (function () {
        function ValueTransformer() {
        }
        ValueTransformer.prototype.visitArray = function (arr, context) {
            var _this = this;
            return arr.map(function (value) { return visitValue(value, _this, context); });
        };
        ValueTransformer.prototype.visitStringMap = function (map, context) {
            var _this = this;
            var result = {};
            Object.keys(map).forEach(function (key) {
                result[key] = visitValue(map[key], _this, context);
            });
            return result;
        };
        ValueTransformer.prototype.visitPrimitive = function (value, context) {
            return value;
        };
        ValueTransformer.prototype.visitOther = function (value, context) {
            return value;
        };
        return ValueTransformer;
    }());
    exports.ValueTransformer = ValueTransformer;
    exports.SyncAsync = {
        assertSync: function (value) {
            if (isPromise(value)) {
                throw new Error("Illegal state: value cannot be a promise");
            }
            return value;
        },
        then: function (value, cb) {
            return isPromise(value) ? value.then(cb) : cb(value);
        },
        all: function (syncAsyncValues) {
            return syncAsyncValues.some(isPromise) ? Promise.all(syncAsyncValues) : syncAsyncValues;
        }
    };
    function error(msg) {
        throw new Error("Internal Error: " + msg);
    }
    exports.error = error;
    // Escape characters that have a special meaning in Regular Expressions
    function escapeRegExp(s) {
        return s.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
    }
    exports.escapeRegExp = escapeRegExp;
    var STRING_MAP_PROTO = Object.getPrototypeOf({});
    function isStrictStringMap(obj) {
        return typeof obj === 'object' && obj !== null && Object.getPrototypeOf(obj) === STRING_MAP_PROTO;
    }
    function utf8Encode(str) {
        var encoded = [];
        for (var index = 0; index < str.length; index++) {
            var codePoint = str.charCodeAt(index);
            // decode surrogate
            // see https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
            if (codePoint >= 0xd800 && codePoint <= 0xdbff && str.length > (index + 1)) {
                var low = str.charCodeAt(index + 1);
                if (low >= 0xdc00 && low <= 0xdfff) {
                    index++;
                    codePoint = ((codePoint - 0xd800) << 10) + low - 0xdc00 + 0x10000;
                }
            }
            if (codePoint <= 0x7f) {
                encoded.push(codePoint);
            }
            else if (codePoint <= 0x7ff) {
                encoded.push(((codePoint >> 6) & 0x1F) | 0xc0, (codePoint & 0x3f) | 0x80);
            }
            else if (codePoint <= 0xffff) {
                encoded.push((codePoint >> 12) | 0xe0, ((codePoint >> 6) & 0x3f) | 0x80, (codePoint & 0x3f) | 0x80);
            }
            else if (codePoint <= 0x1fffff) {
                encoded.push(((codePoint >> 18) & 0x07) | 0xf0, ((codePoint >> 12) & 0x3f) | 0x80, ((codePoint >> 6) & 0x3f) | 0x80, (codePoint & 0x3f) | 0x80);
            }
        }
        return encoded;
    }
    exports.utf8Encode = utf8Encode;
    function stringify(token) {
        if (typeof token === 'string') {
            return token;
        }
        if (Array.isArray(token)) {
            return '[' + token.map(stringify).join(', ') + ']';
        }
        if (token == null) {
            return '' + token;
        }
        if (token.overriddenName) {
            return "" + token.overriddenName;
        }
        if (token.name) {
            return "" + token.name;
        }
        if (!token.toString) {
            return 'object';
        }
        // WARNING: do not try to `JSON.stringify(token)` here
        // see https://github.com/angular/angular/issues/23440
        var res = token.toString();
        if (res == null) {
            return '' + res;
        }
        var newLineIndex = res.indexOf('\n');
        return newLineIndex === -1 ? res : res.substring(0, newLineIndex);
    }
    exports.stringify = stringify;
    /**
     * Lazily retrieves the reference value from a forwardRef.
     */
    function resolveForwardRef(type) {
        if (typeof type === 'function' && type.hasOwnProperty('__forward_ref__')) {
            return type();
        }
        else {
            return type;
        }
    }
    exports.resolveForwardRef = resolveForwardRef;
    /**
     * Determine if the argument is shaped like a Promise
     */
    function isPromise(obj) {
        // allow any Promise/A+ compliant thenable.
        // It's up to the caller to ensure that obj.then conforms to the spec
        return !!obj && typeof obj.then === 'function';
    }
    exports.isPromise = isPromise;
    var Version = /** @class */ (function () {
        function Version(full) {
            this.full = full;
            var splits = full.split('.');
            this.major = splits[0];
            this.minor = splits[1];
            this.patch = splits.slice(2).join('.');
        }
        return Version;
    }());
    exports.Version = Version;
    var __window = typeof window !== 'undefined' && window;
    var __self = typeof self !== 'undefined' && typeof WorkerGlobalScope !== 'undefined' &&
        self instanceof WorkerGlobalScope && self;
    var __global = typeof global !== 'undefined' && global;
    // Check __global first, because in Node tests both __global and __window may be defined and _global
    // should be __global in that case.
    var _global = __global || __window || __self;
    exports.global = _global;
    function newArray(size, value) {
        var list = [];
        for (var i = 0; i < size; i++) {
            list.push(value);
        }
        return list;
    }
    exports.newArray = newArray;
    /**
     * Partitions a given array into 2 arrays, based on a boolean value returned by the condition
     * function.
     *
     * @param arr Input array that should be partitioned
     * @param conditionFn Condition function that is called for each item in a given array and returns a
     * boolean value.
     */
    function partitionArray(arr, conditionFn) {
        var e_1, _a;
        var truthy = [];
        var falsy = [];
        try {
            for (var arr_1 = tslib_1.__values(arr), arr_1_1 = arr_1.next(); !arr_1_1.done; arr_1_1 = arr_1.next()) {
                var item = arr_1_1.value;
                (conditionFn(item) ? truthy : falsy).push(item);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (arr_1_1 && !arr_1_1.done && (_a = arr_1.return)) _a.call(arr_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return [truthy, falsy];
    }
    exports.partitionArray = partitionArray;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyL3NyYy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCxJQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBQztJQUV6QyxTQUFnQixtQkFBbUIsQ0FBQyxLQUFhO1FBQy9DLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRTtZQUFDLFdBQVc7aUJBQVgsVUFBVyxFQUFYLHFCQUFXLEVBQVgsSUFBVztnQkFBWCxzQkFBVzs7WUFBSyxPQUFBLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUU7UUFBbEIsQ0FBa0IsQ0FBQyxDQUFDO0lBQzlFLENBQUM7SUFGRCxrREFFQztJQUVELFNBQWdCLFlBQVksQ0FBQyxLQUFhLEVBQUUsYUFBdUI7UUFDakUsT0FBTyxRQUFRLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRkQsb0NBRUM7SUFFRCxTQUFnQixhQUFhLENBQUMsS0FBYSxFQUFFLGFBQXVCO1FBQ2xFLE9BQU8sUUFBUSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUZELHNDQUVDO0lBRUQsU0FBUyxRQUFRLENBQUMsS0FBYSxFQUFFLFNBQWlCLEVBQUUsYUFBdUI7UUFDekUsSUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoRCxJQUFJLGNBQWMsSUFBSSxDQUFDLENBQUM7WUFBRSxPQUFPLGFBQWEsQ0FBQztRQUMvQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxjQUFjLEdBQUcsQ0FB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S0FBSyxXQUFXLElBQUksTUFBTSxDQUFDO0lBRXpELG9HQUFvRztJQUNwRyxtQ0FBbUM7SUFDbkMsSUFBTSxPQUFPLEdBQTBCLFFBQVEsSUFBSSxRQUFRLElBQUksTUFBTSxDQUFDO0lBQ25ELHlCQUFNO0lBSXpCLFNBQWdCLFFBQVEsQ0FBSSxJQUFZLEVBQUUsS0FBUztRQUNqRCxJQUFNLElBQUksR0FBUSxFQUFFLENBQUM7UUFDckIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQU0sQ0FBQyxDQUFDO1NBQ25CO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBTkQsNEJBTUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0gsU0FBZ0IsY0FBYyxDQUMxQixHQUFZLEVBQUUsV0FBb0M7O1FBQ3BELElBQU0sTUFBTSxHQUFRLEVBQUUsQ0FBQztRQUN2QixJQUFNLEtBQUssR0FBUSxFQUFFLENBQUM7O1lBQ3RCLEtBQW1CLElBQUEsUUFBQSxpQkFBQSxHQUFHLENBQUEsd0JBQUEseUNBQUU7Z0JBQW5CLElBQU0sSUFBSSxnQkFBQTtnQkFDYixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBVyxDQUFDLENBQUM7YUFDeEQ7Ozs7Ozs7OztRQUNELE9BQU8sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDekIsQ0FBQztJQVJELHdDQVFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmNvbnN0IERBU0hfQ0FTRV9SRUdFWFAgPSAvLSsoW2EtejAtOV0pL2c7XG5cbmV4cG9ydCBmdW5jdGlvbiBkYXNoQ2FzZVRvQ2FtZWxDYXNlKGlucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gaW5wdXQucmVwbGFjZShEQVNIX0NBU0VfUkVHRVhQLCAoLi4ubTogYW55W10pID0+IG1bMV0udG9VcHBlckNhc2UoKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzcGxpdEF0Q29sb24oaW5wdXQ6IHN0cmluZywgZGVmYXVsdFZhbHVlczogc3RyaW5nW10pOiBzdHJpbmdbXSB7XG4gIHJldHVybiBfc3BsaXRBdChpbnB1dCwgJzonLCBkZWZhdWx0VmFsdWVzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNwbGl0QXRQZXJpb2QoaW5wdXQ6IHN0cmluZywgZGVmYXVsdFZhbHVlczogc3RyaW5nW10pOiBzdHJpbmdbXSB7XG4gIHJldHVybiBfc3BsaXRBdChpbnB1dCwgJy4nLCBkZWZhdWx0VmFsdWVzKTtcbn1cblxuZnVuY3Rpb24gX3NwbGl0QXQoaW5wdXQ6IHN0cmluZywgY2hhcmFjdGVyOiBzdHJpbmcsIGRlZmF1bHRWYWx1ZXM6IHN0cmluZ1tdKTogc3RyaW5nW10ge1xuICBjb25zdCBjaGFyYWN0ZXJJbmRleCA9IGlucHV0LmluZGV4T2YoY2hhcmFjdGVyKTtcbiAgaWYgKGNoYXJhY3RlckluZGV4ID09IC0xKSByZXR1cm4gZGVmYXVsdFZhbHVlcztcbiAgcmV0dXJuIFtpbnB1dC5zbGljZSgwLCBjaGFyYWN0ZXJJbmRleCkudHJpbSgpLCBpbnB1dC5zbGljZShjaGFyYWN0ZXJJbmRleCArIDEpLnRyaW0oKV07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2aXNpdFZhbHVlKHZhbHVlOiBhbnksIHZpc2l0b3I6IFZhbHVlVmlzaXRvciwgY29udGV4dDogYW55KTogYW55IHtcbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZpc2l0b3IudmlzaXRBcnJheSg8YW55W10+dmFsdWUsIGNvbnRleHQpO1xuICB9XG5cbiAgaWYgKGlzU3RyaWN0U3RyaW5nTWFwKHZhbHVlKSkge1xuICAgIHJldHVybiB2aXNpdG9yLnZpc2l0U3RyaW5nTWFwKDx7W2tleTogc3RyaW5nXTogYW55fT52YWx1ZSwgY29udGV4dCk7XG4gIH1cblxuICBpZiAodmFsdWUgPT0gbnVsbCB8fCB0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycgfHwgdHlwZW9mIHZhbHVlID09ICdudW1iZXInIHx8XG4gICAgICB0eXBlb2YgdmFsdWUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgcmV0dXJuIHZpc2l0b3IudmlzaXRQcmltaXRpdmUodmFsdWUsIGNvbnRleHQpO1xuICB9XG5cbiAgcmV0dXJuIHZpc2l0b3IudmlzaXRPdGhlcih2YWx1ZSwgY29udGV4dCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0RlZmluZWQodmFsOiBhbnkpOiBib29sZWFuIHtcbiAgcmV0dXJuIHZhbCAhPT0gbnVsbCAmJiB2YWwgIT09IHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vVW5kZWZpbmVkPFQ+KHZhbDogVHx1bmRlZmluZWQpOiBUIHtcbiAgcmV0dXJuIHZhbCA9PT0gdW5kZWZpbmVkID8gbnVsbCEgOiB2YWw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmFsdWVWaXNpdG9yIHtcbiAgdmlzaXRBcnJheShhcnI6IGFueVtdLCBjb250ZXh0OiBhbnkpOiBhbnk7XG4gIHZpc2l0U3RyaW5nTWFwKG1hcDoge1trZXk6IHN0cmluZ106IGFueX0sIGNvbnRleHQ6IGFueSk6IGFueTtcbiAgdmlzaXRQcmltaXRpdmUodmFsdWU6IGFueSwgY29udGV4dDogYW55KTogYW55O1xuICB2aXNpdE90aGVyKHZhbHVlOiBhbnksIGNvbnRleHQ6IGFueSk6IGFueTtcbn1cblxuZXhwb3J0IGNsYXNzIFZhbHVlVHJhbnNmb3JtZXIgaW1wbGVtZW50cyBWYWx1ZVZpc2l0b3Ige1xuICB2aXNpdEFycmF5KGFycjogYW55W10sIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIGFyci5tYXAodmFsdWUgPT4gdmlzaXRWYWx1ZSh2YWx1ZSwgdGhpcywgY29udGV4dCkpO1xuICB9XG4gIHZpc2l0U3RyaW5nTWFwKG1hcDoge1trZXk6IHN0cmluZ106IGFueX0sIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgY29uc3QgcmVzdWx0OiB7W2tleTogc3RyaW5nXTogYW55fSA9IHt9O1xuICAgIE9iamVjdC5rZXlzKG1hcCkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgcmVzdWx0W2tleV0gPSB2aXNpdFZhbHVlKG1hcFtrZXldLCB0aGlzLCBjb250ZXh0KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHZpc2l0UHJpbWl0aXZlKHZhbHVlOiBhbnksIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIHZpc2l0T3RoZXIodmFsdWU6IGFueSwgY29udGV4dDogYW55KTogYW55IHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUgU3luY0FzeW5jPFQ+ID0gVHxQcm9taXNlPFQ+O1xuXG5leHBvcnQgY29uc3QgU3luY0FzeW5jID0ge1xuICBhc3NlcnRTeW5jOiA8VD4odmFsdWU6IFN5bmNBc3luYzxUPik6IFQgPT4ge1xuICAgIGlmIChpc1Byb21pc2UodmFsdWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYElsbGVnYWwgc3RhdGU6IHZhbHVlIGNhbm5vdCBiZSBhIHByb21pc2VgKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9LFxuICB0aGVuOiA8VCwgUj4odmFsdWU6IFN5bmNBc3luYzxUPiwgY2I6ICh2YWx1ZTogVCkgPT4gUiB8IFByb21pc2U8Uj58IFN5bmNBc3luYzxSPik6XG4gICAgICBTeW5jQXN5bmM8Uj4gPT4ge1xuICAgICAgICByZXR1cm4gaXNQcm9taXNlKHZhbHVlKSA/IHZhbHVlLnRoZW4oY2IpIDogY2IodmFsdWUpO1xuICAgICAgfSxcbiAgYWxsOiA8VD4oc3luY0FzeW5jVmFsdWVzOiBTeW5jQXN5bmM8VD5bXSk6IFN5bmNBc3luYzxUW10+ID0+IHtcbiAgICByZXR1cm4gc3luY0FzeW5jVmFsdWVzLnNvbWUoaXNQcm9taXNlKSA/IFByb21pc2UuYWxsKHN5bmNBc3luY1ZhbHVlcykgOiBzeW5jQXN5bmNWYWx1ZXMgYXMgVFtdO1xuICB9XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZXJyb3IobXNnOiBzdHJpbmcpOiBuZXZlciB7XG4gIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgRXJyb3I6ICR7bXNnfWApO1xufVxuXG4vLyBFc2NhcGUgY2hhcmFjdGVycyB0aGF0IGhhdmUgYSBzcGVjaWFsIG1lYW5pbmcgaW4gUmVndWxhciBFeHByZXNzaW9uc1xuZXhwb3J0IGZ1bmN0aW9uIGVzY2FwZVJlZ0V4cChzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcy5yZXBsYWNlKC8oWy4qKz9ePSE6JHt9KCl8W1xcXVxcL1xcXFxdKS9nLCAnXFxcXCQxJyk7XG59XG5cbmNvbnN0IFNUUklOR19NQVBfUFJPVE8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yoe30pO1xuZnVuY3Rpb24gaXNTdHJpY3RTdHJpbmdNYXAob2JqOiBhbnkpOiBib29sZWFuIHtcbiAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIG9iaiAhPT0gbnVsbCAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKSA9PT0gU1RSSU5HX01BUF9QUk9UTztcbn1cblxuZXhwb3J0IHR5cGUgQnl0ZSA9IG51bWJlcjtcblxuZXhwb3J0IGZ1bmN0aW9uIHV0ZjhFbmNvZGUoc3RyOiBzdHJpbmcpOiBCeXRlW10ge1xuICBsZXQgZW5jb2RlZDogQnl0ZVtdID0gW107XG4gIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBzdHIubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgbGV0IGNvZGVQb2ludCA9IHN0ci5jaGFyQ29kZUF0KGluZGV4KTtcblxuICAgIC8vIGRlY29kZSBzdXJyb2dhdGVcbiAgICAvLyBzZWUgaHR0cHM6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmcjc3Vycm9nYXRlLWZvcm11bGFlXG4gICAgaWYgKGNvZGVQb2ludCA+PSAweGQ4MDAgJiYgY29kZVBvaW50IDw9IDB4ZGJmZiAmJiBzdHIubGVuZ3RoID4gKGluZGV4ICsgMSkpIHtcbiAgICAgIGNvbnN0IGxvdyA9IHN0ci5jaGFyQ29kZUF0KGluZGV4ICsgMSk7XG4gICAgICBpZiAobG93ID49IDB4ZGMwMCAmJiBsb3cgPD0gMHhkZmZmKSB7XG4gICAgICAgIGluZGV4Kys7XG4gICAgICAgIGNvZGVQb2ludCA9ICgoY29kZVBvaW50IC0gMHhkODAwKSA8PCAxMCkgKyBsb3cgLSAweGRjMDAgKyAweDEwMDAwO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb2RlUG9pbnQgPD0gMHg3Zikge1xuICAgICAgZW5jb2RlZC5wdXNoKGNvZGVQb2ludCk7XG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPD0gMHg3ZmYpIHtcbiAgICAgIGVuY29kZWQucHVzaCgoKGNvZGVQb2ludCA+PiA2KSAmIDB4MUYpIHwgMHhjMCwgKGNvZGVQb2ludCAmIDB4M2YpIHwgMHg4MCk7XG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPD0gMHhmZmZmKSB7XG4gICAgICBlbmNvZGVkLnB1c2goXG4gICAgICAgICAgKGNvZGVQb2ludCA+PiAxMikgfCAweGUwLCAoKGNvZGVQb2ludCA+PiA2KSAmIDB4M2YpIHwgMHg4MCwgKGNvZGVQb2ludCAmIDB4M2YpIHwgMHg4MCk7XG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPD0gMHgxZmZmZmYpIHtcbiAgICAgIGVuY29kZWQucHVzaChcbiAgICAgICAgICAoKGNvZGVQb2ludCA+PiAxOCkgJiAweDA3KSB8IDB4ZjAsICgoY29kZVBvaW50ID4+IDEyKSAmIDB4M2YpIHwgMHg4MCxcbiAgICAgICAgICAoKGNvZGVQb2ludCA+PiA2KSAmIDB4M2YpIHwgMHg4MCwgKGNvZGVQb2ludCAmIDB4M2YpIHwgMHg4MCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGVuY29kZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnkodG9rZW46IGFueSk6IHN0cmluZyB7XG4gIGlmICh0eXBlb2YgdG9rZW4gPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHRva2VuO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodG9rZW4pKSB7XG4gICAgcmV0dXJuICdbJyArIHRva2VuLm1hcChzdHJpbmdpZnkpLmpvaW4oJywgJykgKyAnXSc7XG4gIH1cblxuICBpZiAodG9rZW4gPT0gbnVsbCkge1xuICAgIHJldHVybiAnJyArIHRva2VuO1xuICB9XG5cbiAgaWYgKHRva2VuLm92ZXJyaWRkZW5OYW1lKSB7XG4gICAgcmV0dXJuIGAke3Rva2VuLm92ZXJyaWRkZW5OYW1lfWA7XG4gIH1cblxuICBpZiAodG9rZW4ubmFtZSkge1xuICAgIHJldHVybiBgJHt0b2tlbi5uYW1lfWA7XG4gIH1cblxuICBpZiAoIXRva2VuLnRvU3RyaW5nKSB7XG4gICAgcmV0dXJuICdvYmplY3QnO1xuICB9XG5cbiAgLy8gV0FSTklORzogZG8gbm90IHRyeSB0byBgSlNPTi5zdHJpbmdpZnkodG9rZW4pYCBoZXJlXG4gIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2lzc3Vlcy8yMzQ0MFxuICBjb25zdCByZXMgPSB0b2tlbi50b1N0cmluZygpO1xuXG4gIGlmIChyZXMgPT0gbnVsbCkge1xuICAgIHJldHVybiAnJyArIHJlcztcbiAgfVxuXG4gIGNvbnN0IG5ld0xpbmVJbmRleCA9IHJlcy5pbmRleE9mKCdcXG4nKTtcbiAgcmV0dXJuIG5ld0xpbmVJbmRleCA9PT0gLTEgPyByZXMgOiByZXMuc3Vic3RyaW5nKDAsIG5ld0xpbmVJbmRleCk7XG59XG5cbi8qKlxuICogTGF6aWx5IHJldHJpZXZlcyB0aGUgcmVmZXJlbmNlIHZhbHVlIGZyb20gYSBmb3J3YXJkUmVmLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUZvcndhcmRSZWYodHlwZTogYW55KTogYW55IHtcbiAgaWYgKHR5cGVvZiB0eXBlID09PSAnZnVuY3Rpb24nICYmIHR5cGUuaGFzT3duUHJvcGVydHkoJ19fZm9yd2FyZF9yZWZfXycpKSB7XG4gICAgcmV0dXJuIHR5cGUoKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdHlwZTtcbiAgfVxufVxuXG4vKipcbiAqIERldGVybWluZSBpZiB0aGUgYXJndW1lbnQgaXMgc2hhcGVkIGxpa2UgYSBQcm9taXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1Byb21pc2U8VCA9IGFueT4ob2JqOiBhbnkpOiBvYmogaXMgUHJvbWlzZTxUPiB7XG4gIC8vIGFsbG93IGFueSBQcm9taXNlL0ErIGNvbXBsaWFudCB0aGVuYWJsZS5cbiAgLy8gSXQncyB1cCB0byB0aGUgY2FsbGVyIHRvIGVuc3VyZSB0aGF0IG9iai50aGVuIGNvbmZvcm1zIHRvIHRoZSBzcGVjXG4gIHJldHVybiAhIW9iaiAmJiB0eXBlb2Ygb2JqLnRoZW4gPT09ICdmdW5jdGlvbic7XG59XG5cbmV4cG9ydCBjbGFzcyBWZXJzaW9uIHtcbiAgcHVibGljIHJlYWRvbmx5IG1ham9yOiBzdHJpbmc7XG4gIHB1YmxpYyByZWFkb25seSBtaW5vcjogc3RyaW5nO1xuICBwdWJsaWMgcmVhZG9ubHkgcGF0Y2g6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgZnVsbDogc3RyaW5nKSB7XG4gICAgY29uc3Qgc3BsaXRzID0gZnVsbC5zcGxpdCgnLicpO1xuICAgIHRoaXMubWFqb3IgPSBzcGxpdHNbMF07XG4gICAgdGhpcy5taW5vciA9IHNwbGl0c1sxXTtcbiAgICB0aGlzLnBhdGNoID0gc3BsaXRzLnNsaWNlKDIpLmpvaW4oJy4nKTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbnNvbGUge1xuICBsb2cobWVzc2FnZTogc3RyaW5nKTogdm9pZDtcbiAgd2FybihtZXNzYWdlOiBzdHJpbmcpOiB2b2lkO1xufVxuXG5cbmRlY2xhcmUgdmFyIFdvcmtlckdsb2JhbFNjb3BlOiBhbnk7XG4vLyBDb21tb25KUyAvIE5vZGUgaGF2ZSBnbG9iYWwgY29udGV4dCBleHBvc2VkIGFzIFwiZ2xvYmFsXCIgdmFyaWFibGUuXG4vLyBXZSBkb24ndCB3YW50IHRvIGluY2x1ZGUgdGhlIHdob2xlIG5vZGUuZC50cyB0aGlzIHRoaXMgY29tcGlsYXRpb24gdW5pdCBzbyB3ZSdsbCBqdXN0IGZha2Vcbi8vIHRoZSBnbG9iYWwgXCJnbG9iYWxcIiB2YXIgZm9yIG5vdy5cbmRlY2xhcmUgdmFyIGdsb2JhbDogYW55O1xuY29uc3QgX193aW5kb3cgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3c7XG5jb25zdCBfX3NlbGYgPSB0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIFdvcmtlckdsb2JhbFNjb3BlICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIHNlbGYgaW5zdGFuY2VvZiBXb3JrZXJHbG9iYWxTY29wZSAmJiBzZWxmO1xuY29uc3QgX19nbG9iYWwgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyAmJiBnbG9iYWw7XG5cbi8vIENoZWNrIF9fZ2xvYmFsIGZpcnN0LCBiZWNhdXNlIGluIE5vZGUgdGVzdHMgYm90aCBfX2dsb2JhbCBhbmQgX193aW5kb3cgbWF5IGJlIGRlZmluZWQgYW5kIF9nbG9iYWxcbi8vIHNob3VsZCBiZSBfX2dsb2JhbCBpbiB0aGF0IGNhc2UuXG5jb25zdCBfZ2xvYmFsOiB7W25hbWU6IHN0cmluZ106IGFueX0gPSBfX2dsb2JhbCB8fCBfX3dpbmRvdyB8fCBfX3NlbGY7XG5leHBvcnQge19nbG9iYWwgYXMgZ2xvYmFsfTtcblxuZXhwb3J0IGZ1bmN0aW9uIG5ld0FycmF5PFQgPSBhbnk+KHNpemU6IG51bWJlcik6IFRbXTtcbmV4cG9ydCBmdW5jdGlvbiBuZXdBcnJheTxUPihzaXplOiBudW1iZXIsIHZhbHVlOiBUKTogVFtdO1xuZXhwb3J0IGZ1bmN0aW9uIG5ld0FycmF5PFQ+KHNpemU6IG51bWJlciwgdmFsdWU/OiBUKTogVFtdIHtcbiAgY29uc3QgbGlzdDogVFtdID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7XG4gICAgbGlzdC5wdXNoKHZhbHVlISk7XG4gIH1cbiAgcmV0dXJuIGxpc3Q7XG59XG5cbi8qKlxuICogUGFydGl0aW9ucyBhIGdpdmVuIGFycmF5IGludG8gMiBhcnJheXMsIGJhc2VkIG9uIGEgYm9vbGVhbiB2YWx1ZSByZXR1cm5lZCBieSB0aGUgY29uZGl0aW9uXG4gKiBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0gYXJyIElucHV0IGFycmF5IHRoYXQgc2hvdWxkIGJlIHBhcnRpdGlvbmVkXG4gKiBAcGFyYW0gY29uZGl0aW9uRm4gQ29uZGl0aW9uIGZ1bmN0aW9uIHRoYXQgaXMgY2FsbGVkIGZvciBlYWNoIGl0ZW0gaW4gYSBnaXZlbiBhcnJheSBhbmQgcmV0dXJucyBhXG4gKiBib29sZWFuIHZhbHVlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFydGl0aW9uQXJyYXk8VCwgRiA9IFQ+KFxuICAgIGFycjogKFR8RilbXSwgY29uZGl0aW9uRm46ICh2YWx1ZTogVHxGKSA9PiBib29sZWFuKTogW1RbXSwgRltdXSB7XG4gIGNvbnN0IHRydXRoeTogVFtdID0gW107XG4gIGNvbnN0IGZhbHN5OiBGW10gPSBbXTtcbiAgZm9yIChjb25zdCBpdGVtIG9mIGFycikge1xuICAgIChjb25kaXRpb25GbihpdGVtKSA/IHRydXRoeSA6IGZhbHN5KS5wdXNoKGl0ZW0gYXMgYW55KTtcbiAgfVxuICByZXR1cm4gW3RydXRoeSwgZmFsc3ldO1xufVxuIl19