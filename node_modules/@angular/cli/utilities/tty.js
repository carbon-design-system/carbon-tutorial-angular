"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function isTTY() {
    const force = process.env['NG_FORCE_TTY'];
    if (force !== undefined) {
        return !(force === '0' || force.toUpperCase() === 'FALSE');
    }
    return !!process.stdout.isTTY && !!process.stdin.isTTY;
}
exports.isTTY = isTTY;
