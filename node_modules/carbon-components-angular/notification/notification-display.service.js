/*!
 *
 * carbon-angular v0.0.0 | notification-display.service.js
 *
 * Copyright 2014, 2019 IBM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import { Injectable, ApplicationRef } from "@angular/core";
var NotificationDisplayService = /** @class */ (function () {
    function NotificationDisplayService(applicationRef) {
        this.applicationRef = applicationRef;
    }
    /**
     * Programatically closes notification based on `notificationRef`.	 *
     */
    NotificationDisplayService.prototype.close = function (notificationRef) {
        var _this = this;
        if (notificationRef.hostView) {
            setTimeout(function () {
                _this.applicationRef.detachView(notificationRef.hostView);
                notificationRef.destroy();
            }, 200);
        }
    };
    NotificationDisplayService.decorators = [
        { type: Injectable },
    ];
    /** @nocollapse */
    NotificationDisplayService.ctorParameters = function () { return [
        { type: ApplicationRef }
    ]; };
    return NotificationDisplayService;
}());
export { NotificationDisplayService };
//# sourceMappingURL=notification-display.service.js.map