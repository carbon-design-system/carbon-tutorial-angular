/*!
 *
 * carbon-angular v0.0.0 | scrollable-list.directive.js
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


import { Input, Directive, ElementRef, HostListener } from "@angular/core";
var ScrollableList = /** @class */ (function () {
    function ScrollableList(elementRef) {
        this.elementRef = elementRef;
        /**
         * Optional target list to scroll
         */
        this.nScrollableList = null;
        /**
         * Enables or disables scrolling for the whole directive
         */
        this.scrollEnabled = true;
        /**
         * How many lines to scroll by each time `wheel` fires
         * Defaults to 10 - based on testing this isn't too fast or slow on any platform
         */
        this.scrollBy = 10;
        this.canScrollUp = false;
        this.canScrollDown = false;
        this.list = this.elementRef.nativeElement;
    }
    ScrollableList.prototype.ngOnChanges = function (changes) {
        var _this = this;
        if (changes.scrollEnabled) {
            if (changes.scrollEnabled.currentValue) {
                this.list.style.overflow = "hidden";
                this.scrollUpTarget.style.display = "flex";
                this.scrollDownTarget.style.display = "flex";
                this.canScrollUp = true;
                this.canScrollDown = true;
                this.updateScrollHeight();
                this.checkScrollArrows();
                setTimeout(function () {
                    _this.checkScrollArrows();
                });
            }
            else {
                this.scrollUpTarget.style.display = "none";
                this.scrollDownTarget.style.display = "none";
                this.canScrollUp = false;
                this.canScrollDown = false;
                this.list.style.height = null;
                this.list.style.overflow = null;
                clearInterval(this.hoverScrollInterval);
            }
        }
    };
    ScrollableList.prototype.ngAfterViewInit = function () {
        var _this = this;
        if (this.nScrollableList) {
            this.list = this.elementRef.nativeElement.querySelector(this.nScrollableList);
        }
        this.scrollUpTarget.addEventListener("mouseover", function () { return _this.onHoverUp(true); });
        this.scrollUpTarget.addEventListener("mouseout", function () { return _this.onHoverUp(false); });
        this.scrollDownTarget.addEventListener("mouseover", function () { return _this.onHoverDown(true); });
        this.scrollDownTarget.addEventListener("mouseout", function () { return _this.onHoverDown(false); });
    };
    ScrollableList.prototype.updateScrollHeight = function () {
        if (this.scrollEnabled) {
            var container = this.elementRef.nativeElement.parentElement;
            var containerRect = container.getBoundingClientRect();
            var innerHeightDiff = this.list.getBoundingClientRect().top - containerRect.top;
            var outerHeightDiff = containerRect.height - (containerRect.bottom - window.innerHeight);
            // 40 gives us some padding between the bottom of the list,
            // the bottom of the window, and the scroll down button
            var height = outerHeightDiff - innerHeightDiff - 40;
            this.list.style.height = height + "px";
        }
    };
    ScrollableList.prototype.checkScrollArrows = function () {
        var scrollUpHeight = this.scrollUpTarget.offsetHeight;
        var scrollDownHeight = this.scrollDownTarget.offsetHeight;
        if (this.list.scrollTop === 0) {
            if (this.canScrollUp) {
                this.list.style.height = parseInt(this.list.style.height, 10) + scrollUpHeight + "px";
            }
            this.scrollUpTarget.style.display = "none";
            this.canScrollUp = false;
        }
        else if (this.list.scrollTop === this.list.scrollTopMax) {
            if (this.canScrollDown) {
                this.list.style.height = parseInt(this.list.style.height, 10) + scrollDownHeight + "px";
            }
            this.scrollDownTarget.style.display = "none";
            this.canScrollDown = false;
        }
        else {
            if (!this.canScrollUp) {
                this.list.style.height = parseInt(this.list.style.height, 10) - scrollUpHeight + "px";
            }
            if (!this.canScrollDown) {
                this.list.style.height = parseInt(this.list.style.height, 10) - scrollDownHeight + "px";
            }
            this.scrollUpTarget.style.display = "flex";
            this.scrollDownTarget.style.display = "flex";
            this.canScrollUp = true;
            this.canScrollDown = true;
        }
    };
    ScrollableList.prototype.onWheel = function (event) {
        if (event.deltaY < 0) {
            this.list.scrollTop -= this.scrollBy;
        }
        else {
            this.list.scrollTop += this.scrollBy;
        }
        // only prevent the parent/window from scrolling if we can scroll
        if (!(this.list.scrollTop === this.list.scrollTopMax || this.list.scrollTop === 0)) {
            event.preventDefault();
            event.stopPropagation();
        }
        this.checkScrollArrows();
    };
    ScrollableList.prototype.onTouchStart = function (event) {
        if (event.touches[0]) {
            this.lastTouch = event.touches[0].clientY;
        }
    };
    ScrollableList.prototype.onTouchMove = function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (event.touches[0]) {
            var touch = event.touches[0];
            this.list.scrollTop += this.lastTouch - touch.clientY;
            this.lastTouch = touch.clientY;
            this.checkScrollArrows();
        }
    };
    ScrollableList.prototype.hoverScrollBy = function (hovering, amount) {
        var _this = this;
        if (hovering) {
            this.hoverScrollInterval = setInterval(function () {
                _this.list.scrollTop += amount;
                _this.checkScrollArrows();
            }, 1);
        }
        else {
            clearInterval(this.hoverScrollInterval);
        }
    };
    ScrollableList.prototype.onHoverUp = function (hovering) {
        // how many px/lines to scroll by on hover
        // 3 is just a random number that felt good
        // 1 and 2 are too slow, 4 works but it might be a tad fast
        this.hoverScrollBy(hovering, -3);
    };
    ScrollableList.prototype.onHoverDown = function (hovering) {
        this.hoverScrollBy(hovering, 3);
    };
    ScrollableList.prototype.onKeyDown = function (event) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            this.checkScrollArrows();
        }
    };
    ScrollableList.decorators = [
        { type: Directive, args: [{
                    selector: "[ibmScrollableList]",
                    exportAs: "scrollable-list"
                },] },
    ];
    /** @nocollapse */
    ScrollableList.ctorParameters = function () { return [
        { type: ElementRef }
    ]; };
    ScrollableList.propDecorators = {
        nScrollableList: [{ type: Input }],
        scrollEnabled: [{ type: Input }],
        scrollUpTarget: [{ type: Input }],
        scrollDownTarget: [{ type: Input }],
        scrollBy: [{ type: Input }],
        onWheel: [{ type: HostListener, args: ["wheel", ["$event"],] }],
        onTouchStart: [{ type: HostListener, args: ["touchstart", ["$event"],] }],
        onTouchMove: [{ type: HostListener, args: ["touchmove", ["$event"],] }],
        onKeyDown: [{ type: HostListener, args: ["keydown", ["$event"],] }]
    };
    return ScrollableList;
}());
export { ScrollableList };
//# sourceMappingURL=scrollable-list.directive.js.map