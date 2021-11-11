(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/configuration", ["require", "exports", "tslib", "crypto", "semver", "vm"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgccConfiguration = exports.ProcessedNgccPackageConfig = exports.DEFAULT_NGCC_CONFIG = exports.PartiallyProcessedConfig = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var crypto_1 = require("crypto");
    var semver_1 = require("semver");
    var vm = require("vm");
    /**
     * The internal representation of a configuration file. Configured packages are transformed into
     * `ProcessedNgccPackageConfig` when a certain version is requested.
     */
    var PartiallyProcessedConfig = /** @class */ (function () {
        function PartiallyProcessedConfig(projectConfig) {
            /**
             * The packages that are configured by this project config, keyed by package name.
             */
            this.packages = new Map();
            /**
             * Options that control how locking the process is handled.
             */
            this.locking = {};
            /**
             * Name of hash algorithm used to generate hashes of the configuration.
             *
             * Defaults to `sha256`.
             */
            this.hashAlgorithm = 'sha256';
            // locking configuration
            if (projectConfig.locking !== undefined) {
                this.locking = projectConfig.locking;
            }
            // packages configuration
            for (var packageNameAndVersion in projectConfig.packages) {
                var packageConfig = projectConfig.packages[packageNameAndVersion];
                if (packageConfig) {
                    var _a = tslib_1.__read(this.splitNameAndVersion(packageNameAndVersion), 2), packageName = _a[0], _b = _a[1], versionRange = _b === void 0 ? '*' : _b;
                    this.addPackageConfig(packageName, tslib_1.__assign(tslib_1.__assign({}, packageConfig), { versionRange: versionRange }));
                }
            }
            // hash algorithm config
            if (projectConfig.hashAlgorithm !== undefined) {
                this.hashAlgorithm = projectConfig.hashAlgorithm;
            }
        }
        PartiallyProcessedConfig.prototype.splitNameAndVersion = function (packageNameAndVersion) {
            var versionIndex = packageNameAndVersion.lastIndexOf('@');
            // Note that > 0 is because we don't want to match @ at the start of the line
            // which is what you would have with a namespaced package, e.g. `@angular/common`.
            return versionIndex > 0 ?
                [
                    packageNameAndVersion.substring(0, versionIndex),
                    packageNameAndVersion.substring(versionIndex + 1),
                ] :
                [packageNameAndVersion, undefined];
        };
        /**
         * Registers the configuration for a particular version of the provided package.
         */
        PartiallyProcessedConfig.prototype.addPackageConfig = function (packageName, config) {
            if (!this.packages.has(packageName)) {
                this.packages.set(packageName, []);
            }
            this.packages.get(packageName).push(config);
        };
        /**
         * Finds the configuration for a particular version of the provided package.
         */
        PartiallyProcessedConfig.prototype.findPackageConfig = function (packageName, version) {
            var _a;
            if (!this.packages.has(packageName)) {
                return null;
            }
            var configs = this.packages.get(packageName);
            if (version === null) {
                // The package has no version (!) - perhaps the entry-point was from a deep import, which made
                // it impossible to find the package.json.
                // So just return the first config that matches the package name.
                return configs[0];
            }
            return (_a = configs.find(function (config) { return semver_1.satisfies(version, config.versionRange, { includePrerelease: true }); })) !== null && _a !== void 0 ? _a : null;
        };
        /**
         * Converts the configuration into a JSON representation that is used to compute a hash of the
         * configuration.
         */
        PartiallyProcessedConfig.prototype.toJson = function () {
            return JSON.stringify(this, function (key, value) {
                var e_1, _a;
                if (value instanceof Map) {
                    var res = {};
                    try {
                        for (var value_1 = tslib_1.__values(value), value_1_1 = value_1.next(); !value_1_1.done; value_1_1 = value_1.next()) {
                            var _b = tslib_1.__read(value_1_1.value, 2), k = _b[0], v = _b[1];
                            res[k] = v;
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (value_1_1 && !value_1_1.done && (_a = value_1.return)) _a.call(value_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return res;
                }
                else {
                    return value;
                }
            });
        };
        return PartiallyProcessedConfig;
    }());
    exports.PartiallyProcessedConfig = PartiallyProcessedConfig;
    /**
     * The default configuration for ngcc.
     *
     * This is the ultimate fallback configuration that ngcc will use if there is no configuration
     * for a package at the package level or project level.
     *
     * This configuration is for packages that are "dead" - i.e. no longer maintained and so are
     * unlikely to be fixed to work with ngcc, nor provide a package level config of their own.
     *
     * The fallback process for looking up configuration is:
     *
     * Project -> Package -> Default
     *
     * If a package provides its own configuration then that would override this default one.
     *
     * Also application developers can always provide configuration at their project level which
     * will override everything else.
     *
     * Note that the fallback is package based not entry-point based.
     * For example, if a there is configuration for a package at the project level this will replace all
     * entry-point configurations that may have been provided in the package level or default level
     * configurations, even if the project level configuration does not provide for a given entry-point.
     */
    exports.DEFAULT_NGCC_CONFIG = {
        packages: {
            // Add default package configuration here. For example:
            // '@angular/fire@^5.2.0': {
            //   entryPoints: {
            //     './database-deprecated': {ignore: true},
            //   },
            // },
            // The package does not contain any `.metadata.json` files in the root directory but only inside
            // `dist/`. Without this config, ngcc does not realize this is a ViewEngine-built Angular
            // package that needs to be compiled to Ivy.
            'angular2-highcharts': {
                entryPoints: {
                    '.': {
                        override: {
                            main: './index.js',
                        },
                    },
                },
            },
            // The `dist/` directory has a duplicate `package.json` pointing to the same files, which (under
            // certain configurations) can causes ngcc to try to process the files twice and fail.
            // Ignore the `dist/` entry-point.
            'ng2-dragula': {
                entryPoints: {
                    './dist': { ignore: true },
                },
            },
        },
        locking: {
            retryDelay: 500,
            retryAttempts: 500,
        }
    };
    var NGCC_CONFIG_FILENAME = 'ngcc.config.js';
    /**
     * The processed package level configuration as a result of processing a raw package level config.
     */
    var ProcessedNgccPackageConfig = /** @class */ (function () {
        function ProcessedNgccPackageConfig(fs, packagePath, _a) {
            var _b = _a.entryPoints, entryPoints = _b === void 0 ? {} : _b, _c = _a.ignorableDeepImportMatchers, ignorableDeepImportMatchers = _c === void 0 ? [] : _c;
            var absolutePathEntries = Object.entries(entryPoints).map(function (_a) {
                var _b = tslib_1.__read(_a, 2), relativePath = _b[0], config = _b[1];
                return [fs.resolve(packagePath, relativePath), config];
            });
            this.packagePath = packagePath;
            this.entryPoints = new Map(absolutePathEntries);
            this.ignorableDeepImportMatchers = ignorableDeepImportMatchers;
        }
        return ProcessedNgccPackageConfig;
    }());
    exports.ProcessedNgccPackageConfig = ProcessedNgccPackageConfig;
    /**
     * Ngcc has a hierarchical configuration system that lets us "fix up" packages that do not
     * work with ngcc out of the box.
     *
     * There are three levels at which configuration can be declared:
     *
     * * Default level - ngcc comes with built-in configuration for well known cases.
     * * Package level - a library author publishes a configuration with their package to fix known
     *   issues.
     * * Project level - the application developer provides a configuration that fixes issues specific
     *   to the libraries used in their application.
     *
     * Ngcc will match configuration based on the package name but also on its version. This allows
     * configuration to provide different fixes to different version ranges of a package.
     *
     * * Package level configuration is specific to the package version where the configuration is
     *   found.
     * * Default and project level configuration should provide version ranges to ensure that the
     *   configuration is only applied to the appropriate versions of a package.
     *
     * When getting a configuration for a package (via `getConfig()`) the caller should provide the
     * version of the package in question, if available. If it is not provided then the first available
     * configuration for a package is returned.
     */
    var NgccConfiguration = /** @class */ (function () {
        function NgccConfiguration(fs, baseDir) {
            this.fs = fs;
            this.cache = new Map();
            this.defaultConfig = new PartiallyProcessedConfig(exports.DEFAULT_NGCC_CONFIG);
            this.projectConfig = new PartiallyProcessedConfig(this.loadProjectConfig(baseDir));
            this.hashAlgorithm = this.projectConfig.hashAlgorithm;
            this.hash = this.computeHash();
        }
        /**
         * Get the configuration options for locking the ngcc process.
         */
        NgccConfiguration.prototype.getLockingConfig = function () {
            var _a = this.projectConfig.locking, retryAttempts = _a.retryAttempts, retryDelay = _a.retryDelay;
            if (retryAttempts === undefined) {
                retryAttempts = this.defaultConfig.locking.retryAttempts;
            }
            if (retryDelay === undefined) {
                retryDelay = this.defaultConfig.locking.retryDelay;
            }
            return { retryAttempts: retryAttempts, retryDelay: retryDelay };
        };
        /**
         * Get a configuration for the given `version` of a package at `packagePath`.
         *
         * @param packageName The name of the package whose config we want.
         * @param packagePath The path to the package whose config we want.
         * @param version The version of the package whose config we want, or `null` if the package's
         * package.json did not exist or was invalid.
         */
        NgccConfiguration.prototype.getPackageConfig = function (packageName, packagePath, version) {
            var rawPackageConfig = this.getRawPackageConfig(packageName, packagePath, version);
            return new ProcessedNgccPackageConfig(this.fs, packagePath, rawPackageConfig);
        };
        NgccConfiguration.prototype.getRawPackageConfig = function (packageName, packagePath, version) {
            var cacheKey = packageName + (version !== null ? "@" + version : '');
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }
            var projectLevelConfig = this.projectConfig.findPackageConfig(packageName, version);
            if (projectLevelConfig !== null) {
                this.cache.set(cacheKey, projectLevelConfig);
                return projectLevelConfig;
            }
            var packageLevelConfig = this.loadPackageConfig(packagePath, version);
            if (packageLevelConfig !== null) {
                this.cache.set(cacheKey, packageLevelConfig);
                return packageLevelConfig;
            }
            var defaultLevelConfig = this.defaultConfig.findPackageConfig(packageName, version);
            if (defaultLevelConfig !== null) {
                this.cache.set(cacheKey, defaultLevelConfig);
                return defaultLevelConfig;
            }
            return { versionRange: '*' };
        };
        NgccConfiguration.prototype.loadProjectConfig = function (baseDir) {
            var configFilePath = this.fs.join(baseDir, NGCC_CONFIG_FILENAME);
            if (this.fs.exists(configFilePath)) {
                try {
                    return this.evalSrcFile(configFilePath);
                }
                catch (e) {
                    throw new Error("Invalid project configuration file at \"" + configFilePath + "\": " + e.message);
                }
            }
            else {
                return { packages: {} };
            }
        };
        NgccConfiguration.prototype.loadPackageConfig = function (packagePath, version) {
            var configFilePath = this.fs.join(packagePath, NGCC_CONFIG_FILENAME);
            if (this.fs.exists(configFilePath)) {
                try {
                    var packageConfig = this.evalSrcFile(configFilePath);
                    return tslib_1.__assign(tslib_1.__assign({}, packageConfig), { versionRange: version || '*' });
                }
                catch (e) {
                    throw new Error("Invalid package configuration file at \"" + configFilePath + "\": " + e.message);
                }
            }
            else {
                return null;
            }
        };
        NgccConfiguration.prototype.evalSrcFile = function (srcPath) {
            var src = this.fs.readFile(srcPath);
            var theExports = {};
            var sandbox = {
                module: { exports: theExports },
                exports: theExports,
                require: require,
                __dirname: this.fs.dirname(srcPath),
                __filename: srcPath
            };
            vm.runInNewContext(src, sandbox, { filename: srcPath });
            return sandbox.module.exports;
        };
        NgccConfiguration.prototype.computeHash = function () {
            return crypto_1.createHash(this.hashAlgorithm).update(this.projectConfig.toJson()).digest('hex');
        };
        return NgccConfiguration;
    }());
    exports.NgccConfiguration = NgccConfiguration;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9wYWNrYWdlcy9jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCxpQ0FBa0M7SUFDbEMsaUNBQWlDO0lBQ2pDLHVCQUF5QjtJQStGekI7OztPQUdHO0lBQ0g7UUFnQkUsa0NBQVksYUFBZ0M7WUFmNUM7O2VBRUc7WUFDSCxhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQW9DLENBQUM7WUFDdkQ7O2VBRUc7WUFDSCxZQUFPLEdBQWdDLEVBQUUsQ0FBQztZQUMxQzs7OztlQUlHO1lBQ0gsa0JBQWEsR0FBRyxRQUFRLENBQUM7WUFHdkIsd0JBQXdCO1lBQ3hCLElBQUksYUFBYSxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUU7Z0JBQ3ZDLElBQUksQ0FBQyxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQzthQUN0QztZQUVELHlCQUF5QjtZQUN6QixLQUFLLElBQU0scUJBQXFCLElBQUksYUFBYSxDQUFDLFFBQVEsRUFBRTtnQkFDMUQsSUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUNwRSxJQUFJLGFBQWEsRUFBRTtvQkFDWCxJQUFBLEtBQUEsZUFBb0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLHFCQUFxQixDQUFDLElBQUEsRUFBbEYsV0FBVyxRQUFBLEVBQUUsVUFBa0IsRUFBbEIsWUFBWSxtQkFBRyxHQUFHLEtBQW1ELENBQUM7b0JBQzFGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLHdDQUFNLGFBQWEsS0FBRSxZQUFZLGNBQUEsSUFBRSxDQUFDO2lCQUN0RTthQUNGO1lBRUQsd0JBQXdCO1lBQ3hCLElBQUksYUFBYSxDQUFDLGFBQWEsS0FBSyxTQUFT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QkFDNUY7YUFDRjtpQkFBTTtnQkFDTCxPQUFPLElBQUksQ0FBQzthQUNiO1FBQ0gsQ0FBQztRQUVPLHVDQUFXLEdBQW5CLFVBQW9CLE9BQXVCO1lBQ3pDLElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3RDLElBQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQztZQUN0QixJQUFNLE9BQU8sR0FBRztnQkFDZCxNQUFNLEVBQUUsRUFBQyxPQUFPLEVBQUUsVUFBVSxFQUFDO2dCQUM3QixPQUFPLEVBQUUsVUFBVTtnQkFDbkIsT0FBTyxTQUFBO2dCQUNQLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7Z0JBQ25DLFVBQVUsRUFBRSxPQUFPO2FBQ3BCLENBQUM7WUFDRixFQUFFLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBQyxRQUFRLEVBQUUsT0FBTyxFQUFDLENBQUMsQ0FBQztZQUN0RCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO1FBQ2hDLENBQUM7UUFFTyx1Q0FBVyxHQUFuQjtZQUNFLE9BQU8sbUJBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDMUYsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQXZIRCxJQXVIQztJQXZIWSw4Q0FBaUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Y3JlYXRlSGFzaH0gZnJvbSAnY3J5cHRvJztcbmltcG9ydCB7c2F0aXNmaWVzfSBmcm9tICdzZW12ZXInO1xuaW1wb3J0ICogYXMgdm0gZnJvbSAndm0nO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBQYXRoTWFuaXB1bGF0aW9uLCBSZWFkb25seUZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5cbmltcG9ydCB7UGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzTWFwfSBmcm9tICcuL2VudHJ5X3BvaW50JztcblxuLyoqXG4gKiBUaGUgZm9ybWF0IG9mIGEgcHJvamVjdCBsZXZlbCBjb25maWd1cmF0aW9uIGZpbGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY1Byb2plY3RDb25maWcge1xuICAvKipcbiAgICogVGhlIHBhY2thZ2VzIHRoYXQgYXJlIGNvbmZpZ3VyZWQgYnkgdGhpcyBwcm9qZWN0IGNvbmZpZy5cbiAgICovXG4gIHBhY2thZ2VzPzoge1twYWNrYWdlUGF0aDogc3RyaW5nXTogUmF3TmdjY1BhY2thZ2VDb25maWd8dW5kZWZpbmVkfTtcbiAgLyoqXG4gICAqIE9wdGlvbnMgdGhhdCBjb250cm9sIGhvdyBsb2NraW5nIHRoZSBwcm9jZXNzIGlzIGhhbmRsZWQuXG4gICAqL1xuICBsb2NraW5nPzogUHJvY2Vzc0xvY2tpbmdDb25maWd1cmF0aW9uO1xuICAvKipcbiAgICogTmFtZSBvZiBoYXNoIGFsZ29yaXRobSB1c2VkIHRvIGdlbmVyYXRlIGhhc2hlcyBvZiB0aGUgY29uZmlndXJhdGlvbi5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYHNoYTI1NmAuXG4gICAqL1xuICBoYXNoQWxnb3JpdGhtPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIE9wdGlvbnMgdGhhdCBjb250cm9sIGhvdyBsb2NraW5nIHRoZSBwcm9jZXNzIGlzIGhhbmRsZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUHJvY2Vzc0xvY2tpbmdDb25maWd1cmF0aW9uIHtcbiAgLyoqXG4gICAqIFRoZSBudW1iZXIgb2YgdGltZXMgdGhlIEFzeW5jTG9ja2VyIHdpbGwgYXR0ZW1wdCB0byBsb2NrIHRoZSBwcm9jZXNzIGJlZm9yZSBmYWlsaW5nLlxuICAgKiBEZWZhdWx0cyB0byA1MDAuXG4gICAqL1xuICByZXRyeUF0dGVtcHRzPzogbnVtYmVyO1xuICAvKipcbiAgICogVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgYmV0d2VlbiBhdHRlbXB0cyB0byBsb2NrIHRoZSBwcm9jZXNzLlxuICAgKiBEZWZhdWx0cyB0byA1MDBtcy5cbiAgICogKi9cbiAgcmV0cnlEZWxheT86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBUaGUgcmF3IGZvcm1hdCBvZiBhIHBhY2thZ2UgbGV2ZWwgY29uZmlndXJhdGlvbiAoYXMgaXQgYXBwZWFycyBpbiBjb25maWd1cmF0aW9uIGZpbGVzKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSYXdOZ2NjUGFja2FnZUNvbmZpZyB7XG4gIC8qKlxuICAgKiBUaGUgZW50cnktcG9pbnRzIHRvIGNvbmZpZ3VyZSBmb3IgdGhpcyBwYWNrYWdlLlxuICAgKlxuICAgKiBJbiB0aGUgY29uZmlnIGZpbGUgdGhlIGtleXMgYXJlIHBhdGhzIHJlbGF0aXZlIHRvIHRoZSBwYWNrYWdlIHBhdGguXG4gICAqL1xuICBlbnRyeVBvaW50cz86IHtbZW50cnlQb2ludFBhdGg6IHN0cmluZ106IE5nY2NFbnRyeVBvaW50Q29uZmlnfTtcblxuICAvKipcbiAgICogQSBjb2xsZWN0aW9uIG9mIHJlZ2V4ZXMgdGhhdCBtYXRjaCBkZWVwIGltcG9ydHMgdG8gaWdub3JlLCBmb3IgdGhpcyBwYWNrYWdlLCByYXRoZXIgdGhhblxuICAgKiBkaXNwbGF5aW5nIGEgd2FybmluZy5cbiAgICovXG4gIGlnbm9yYWJsZURlZXBJbXBvcnRNYXRjaGVycz86IFJlZ0V4cFtdO1xufVxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgYW4gZW50cnktcG9pbnQuXG4gKlxuICogVGhlIGV4aXN0ZW5jZSBvZiBhIGNvbmZpZ3VyYXRpb24gZm9yIGEgcGF0aCB0ZWxscyBuZ2NjIHRoYXQgdGhpcyBzaG91bGQgYmUgY29uc2lkZXJlZCBmb3JcbiAqIHByb2Nlc3NpbmcgYXMgYW4gZW50cnktcG9pbnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY0VudHJ5UG9pbnRDb25maWcge1xuICAvKiogRG8gbm90IHByb2Nlc3MgKG9yIGV2ZW4gYWNrbm93bGVkZ2UgdGhlIGV4aXN0ZW5jZSBvZikgdGhpcyBlbnRyeS1wb2ludCwgaWYgdHJ1ZS4gKi9cbiAgaWdub3JlPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhpcyBwcm9wZXJ0eSwgaWYgcHJvdmlkZWQsIGhvbGRzIHZhbHVlcyB0aGF0IHdpbGwgb3ZlcnJpZGUgZXF1aXZhbGVudCBwcm9wZXJ0aWVzIGluIGFuXG4gICAqIGVudHJ5LXBvaW50J3MgcGFja2FnZS5qc29uIGZpbGUuXG4gICAqL1xuICBvdmVycmlkZT86IFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllc01hcDtcblxuICAvKipcbiAgICogTm9ybWFsbHksIG5nY2Mgd2lsbCBza2lwIGNvbXBpbGF0aW9uIG9mIGVudHJ5cG9pbnRzIHRoYXQgY29udGFpbiBpbXBvcnRzIHRoYXQgY2FuJ3QgYmUgcmVzb2x2ZWRcbiAgICogb3IgdW5kZXJzdG9vZC4gSWYgdGhpcyBvcHRpb24gaXMgc3BlY2lmaWVkLCBuZ2NjIHdpbGwgcHJvY2VlZCB3aXRoIGNvbXBpbGluZyB0aGUgZW50cnlwb2ludFxuICAgKiBldmVuIGluIHRoZSBmYWNlIG9mIHN1Y2ggbWlzc2luZyBkZXBlbmRlbmNpZXMuXG4gICAqL1xuICBpZ25vcmVNaXNzaW5nRGVwZW5kZW5jaWVzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogRW5hYmxpbmcgdGhpcyBvcHRpb24gZm9yIGFuIGVudHJ5cG9pbnQgdGVsbHMgbmdjYyB0aGF0IGRlZXAgaW1wb3J0cyBtaWdodCBiZSB1c2VkIGZvciB0aGUgZmlsZXNcbiAgICogaXQgY29udGFpbnMsIGFuZCB0aGF0IGl0IHNob3VsZCBnZW5lcmF0ZSBwcml2YXRlIHJlLWV4cG9ydHMgYWxvbmdzaWRlIHRoZSBOZ01vZHVsZSBvZiBhbGwgdGhlXG4gICAqIGRpcmVjdGl2ZXMvcGlwZXMgaXQgbWFrZXMgYXZhaWxhYmxlIGluIHN1cHBvcnQgb2YgdGhvc2UgaW1wb3J0cy5cbiAgICovXG4gIGdlbmVyYXRlRGVlcFJlZXhwb3J0cz86IGJvb2xlYW47XG59XG5cbmludGVyZmFjZSBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnIGV4dGVuZHMgUmF3TmdjY1BhY2thZ2VDb25maWcge1xuICB2ZXJzaW9uUmFuZ2U6IHN0cmluZztcbn1cblxuLyoqXG4gKiBUaGUgaW50ZXJuYWwgcmVwcmVzZW50YXRpb24gb2YgYSBjb25maWd1cmF0aW9uIGZpbGUuIENvbmZpZ3VyZWQgcGFja2FnZXMgYXJlIHRyYW5zZm9ybWVkIGludG9cbiAqIGBQcm9jZXNzZWROZ2NjUGFja2FnZUNvbmZpZ2Agd2hlbiBhIGNlcnRhaW4gdmVyc2lvbiBpcyByZXF1ZXN0ZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBQYXJ0aWFsbHlQcm9jZXNzZWRDb25maWcge1xuICAvKipcbiAgICogVGhlIHBhY2thZ2VzIHRoYXQgYXJlIGNvbmZpZ3VyZWQgYnkgdGhpcyBwcm9qZWN0IGNvbmZpZywga2V5ZWQgYnkgcGFja2FnZSBuYW1lLlxuICAgKi9cbiAgcGFja2FnZXMgPSBuZXcgTWFwPHN0cmluZywgVmVyc2lvbmVkUGFja2FnZUNvbmZpZ1tdPigpO1xuICAvKipcbiAgICogT3B0aW9ucyB0aGF0IGNvbnRyb2wgaG93IGxvY2tpbmcgdGhlIHByb2Nlc3MgaXMgaGFuZGxlZC5cbiAgICovXG4gIGxvY2tpbmc6IFByb2Nlc3NMb2NraW5nQ29uZmlndXJhdGlvbiA9IHt9O1xuICAvKipcbiAgICogTmFtZSBvZiBoYXNoIGFsZ29yaXRobSB1c2VkIHRvIGdlbmVyYXRlIGhhc2hlcyBvZiB0aGUgY29uZmlndXJhdGlvbi5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYHNoYTI1NmAuXG4gICAqL1xuICBoYXNoQWxnb3JpdGhtID0gJ3NoYTI1Nic7XG5cbiAgY29uc3RydWN0b3IocHJvamVjdENvbmZpZzogTmdjY1Byb2plY3RDb25maWcpIHtcbiAgICAvLyBsb2NraW5nIGNvbmZpZ3VyYXRpb25cbiAgICBpZiAocHJvamVjdENvbmZpZy5sb2NraW5nICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMubG9ja2luZyA9IHByb2plY3RDb25maWcubG9ja2luZztcbiAgICB9XG5cbiAgICAvLyBwYWNrYWdlcyBjb25maWd1cmF0aW9uXG4gICAgZm9yIChjb25zdCBwYWNrYWdlTmFtZUFuZFZlcnNpb24gaW4gcHJvamVjdENvbmZpZy5wYWNrYWdlcykge1xuICAgICAgY29uc3QgcGFja2FnZUNvbmZpZyA9IHByb2plY3RDb25maWcucGFja2FnZXNbcGFja2FnZU5hbWVBbmRWZXJzaW9uXTtcbiAgICAgIGlmIChwYWNrYWdlQ29uZmlnKSB7XG4gICAgICAgIGNvbnN0IFtwYWNrYWdlTmFtZSwgdmVyc2lvblJhbmdlID0gJyonXSA9IHRoaXMuc3BsaXROYW1lQW5kVmVyc2lvbihwYWNrYWdlTmFtZUFuZFZlcnNpb24pO1xuICAgICAgICB0aGlzLmFkZFBhY2thZ2VDb25maWcocGFja2FnZU5hbWUsIHsuLi5wYWNrYWdlQ29uZmlnLCB2ZXJzaW9uUmFuZ2V9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBoYXNoIGFsZ29yaXRobSBjb25maWdcbiAgICBpZiAocHJvamVjdENvbmZpZy5oYXNoQWxnb3JpdGhtICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuaGFzaEFsZ29yaXRobSA9IHByb2plY3RDb25maWcuaGFzaEFsZ29yaXRobTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHNwbGl0TmFtZUFuZFZlcnNpb24ocGFja2FnZU5hbWVBbmRWZXJzaW9uOiBzdHJpbmcpOiBbc3RyaW5nLCBzdHJpbmd8dW5kZWZpbmVkXSB7XG4gICAgY29uc3QgdmVyc2lvbkluZGV4ID0gcGFja2FnZU5hbWVBbmRWZXJzaW9uLmxhc3RJbmRleE9mKCdAJyk7XG4gICAgLy8gTm90ZSB0aGF0ID4gMCBpcyBiZWNhdXNlIHdlIGRvbid0IHdhbnQgdG8gbWF0Y2ggQCBhdCB0aGUgc3RhcnQgb2YgdGhlIGxpbmVcbiAgICAvLyB3aGljaCBpcyB3aGF0IHlvdSB3b3VsZCBoYXZlIHdpdGggYSBuYW1lc3BhY2VkIHBhY2thZ2UsIGUuZy4gYEBhbmd1bGFyL2NvbW1vbmAuXG4gICAgcmV0dXJuIHZlcnNpb25JbmRleCA+IDAgP1xuICAgICAgICBbXG4gICAgICAgICAgcGFja2FnZU5hbWVBbmRWZXJzaW9uLnN1YnN0cmluZygwLCB2ZXJzaW9uSW5kZXgpLFxuICAgICAgICAgIHBhY2thZ2VOYW1lQW5kVmVyc2lvbi5zdWJzdHJpbmcodmVyc2lvbkluZGV4ICsgMSksXG4gICAgICAgIF0gOlxuICAgICAgICBbcGFja2FnZU5hbWVBbmRWZXJzaW9uLCB1bmRlZmluZWRdO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyB0aGUgY29uZmlndXJhdGlvbiBmb3IgYSBwYXJ0aWN1bGFyIHZlcnNpb24gb2YgdGhlIHByb3ZpZGVkIHBhY2thZ2UuXG4gICAqL1xuICBwcml2YXRlIGFkZFBhY2thZ2VDb25maWcocGFja2FnZU5hbWU6IHN0cmluZywgY29uZmlnOiBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnBhY2thZ2VzLmhhcyhwYWNrYWdlTmFtZSkpIHtcbiAgICAgIHRoaXMucGFja2FnZXMuc2V0KHBhY2thZ2VOYW1lLCBbXSk7XG4gICAgfVxuICAgIHRoaXMucGFja2FnZXMuZ2V0KHBhY2thZ2VOYW1lKSEucHVzaChjb25maWcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIHRoZSBjb25maWd1cmF0aW9uIGZvciBhIHBhcnRpY3VsYXIgdmVyc2lvbiBvZiB0aGUgcHJvdmlkZWQgcGFja2FnZS5cbiAgICovXG4gIGZpbmRQYWNrYWdlQ29uZmlnKHBhY2thZ2VOYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZ3xudWxsKTogVmVyc2lvbmVkUGFja2FnZUNvbmZpZ3xudWxsIHtcbiAgICBpZiAoIXRoaXMucGFja2FnZXMuaGFzKHBhY2thZ2VOYW1lKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgY29uZmlncyA9IHRoaXMucGFja2FnZXMuZ2V0KHBhY2thZ2VOYW1lKSE7XG4gICAgaWYgKHZlcnNpb24gPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZSBwYWNrYWdlIGhhcyBubyB2ZXJzaW9uICghKSAtIHBlcmhhcHMgdGhlIGVudHJ5LXBvaW50IHdhcyBmcm9tIGEgZGVlcCBpbXBvcnQsIHdoaWNoIG1hZGVcbiAgICAgIC8vIGl0IGltcG9zc2libGUgdG8gZmluZCB0aGUgcGFja2FnZS5qc29uLlxuICAgICAgLy8gU28ganVzdCByZXR1cm4gdGhlIGZpcnN0IGNvbmZpZyB0aGF0IG1hdGNoZXMgdGhlIHBhY2thZ2UgbmFtZS5cbiAgICAgIHJldHVybiBjb25maWdzWzBdO1xuICAgIH1cbiAgICByZXR1cm4gY29uZmlncy5maW5kKFxuICAgICAgICAgICAgICAgY29uZmlnID0+IHNhdGlzZmllcyh2ZXJzaW9uLCBjb25maWcudmVyc2lvblJhbmdlLCB7aW5jbHVkZVByZXJlbGVhc2U6IHRydWV9KSkgPz9cbiAgICAgICAgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyB0aGUgY29uZmlndXJhdGlvbiBpbnRvIGEgSlNPTiByZXByZXNlbnRhdGlvbiB0aGF0IGlzIHVzZWQgdG8gY29tcHV0ZSBhIGhhc2ggb2YgdGhlXG4gICAqIGNvbmZpZ3VyYXRpb24uXG4gICAqL1xuICB0b0pzb24oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcywgKGtleTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bikgPT4ge1xuICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgTWFwKSB7XG4gICAgICAgIGNvbnN0IHJlczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBbaywgdl0gb2YgdmFsdWUpIHtcbiAgICAgICAgICByZXNba10gPSB2O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBUaGUgZGVmYXVsdCBjb25maWd1cmF0aW9uIGZvciBuZ2NjLlxuICpcbiAqIFRoaXMgaXMgdGhlIHVsdGltYXRlIGZhbGxiYWNrIGNvbmZpZ3VyYXRpb24gdGhhdCBuZ2NjIHdpbGwgdXNlIGlmIHRoZXJlIGlzIG5vIGNvbmZpZ3VyYXRpb25cbiAqIGZvciBhIHBhY2thZ2UgYXQgdGhlIHBhY2thZ2UgbGV2ZWwgb3IgcHJvamVjdCBsZXZlbC5cbiAqXG4gKiBUaGlzIGNvbmZpZ3VyYXRpb24gaXMgZm9yIHBhY2thZ2VzIHRoYXQgYXJlIFwiZGVhZFwiIC0gaS5lLiBubyBsb25nZXIgbWFpbnRhaW5lZCBhbmQgc28gYXJlXG4gKiB1bmxpa2VseSB0byBiZSBmaXhlZCB0byB3b3JrIHdpdGggbmdjYywgbm9yIHByb3ZpZGUgYSBwYWNrYWdlIGxldmVsIGNvbmZpZyBvZiB0aGVpciBvd24uXG4gKlxuICogVGhlIGZhbGxiYWNrIHByb2Nlc3MgZm9yIGxvb2tpbmcgdXAgY29uZmlndXJhdGlvbiBpczpcbiAqXG4gKiBQcm9qZWN0IC0+IFBhY2thZ2UgLT4gRGVmYXVsdFxuICpcbiAqIElmIGEgcGFja2FnZSBwcm92aWRlcyBpdHMgb3duIGNvbmZpZ3VyYXRpb24gdGhlbiB0aGF0IHdvdWxkIG92ZXJyaWRlIHRoaXMgZGVmYXVsdCBvbmUuXG4gKlxuICogQWxzbyBhcHBsaWNhdGlvbiBkZXZlbG9wZXJzIGNhbiBhbHdheXMgcHJvdmlkZSBjb25maWd1cmF0aW9uIGF0IHRoZWlyIHByb2plY3QgbGV2ZWwgd2hpY2hcbiAqIHdpbGwgb3ZlcnJpZGUgZXZlcnl0aGluZyBlbHNlLlxuICpcbiAqIE5vdGUgdGhhdCB0aGUgZmFsbGJhY2sgaXMgcGFja2FnZSBiYXNlZCBub3QgZW50cnktcG9pbnQgYmFzZWQuXG4gKiBGb3IgZXhhbXBsZSwgaWYgYSB0aGVyZSBpcyBjb25maWd1cmF0aW9uIGZvciBhIHBhY2thZ2UgYXQgdGhlIHByb2plY3QgbGV2ZWwgdGhpcyB3aWxsIHJlcGxhY2UgYWxsXG4gKiBlbnRyeS1wb2ludCBjb25maWd1cmF0aW9ucyB0aGF0IG1heSBoYXZlIGJlZW4gcHJvdmlkZWQgaW4gdGhlIHBhY2thZ2UgbGV2ZWwgb3IgZGVmYXVsdCBsZXZlbFxuICogY29uZmlndXJhdGlvbnMsIGV2ZW4gaWYgdGhlIHByb2plY3QgbGV2ZWwgY29uZmlndXJhdGlvbiBkb2VzIG5vdCBwcm92aWRlIGZvciBhIGdpdmVuIGVudHJ5LXBvaW50LlxuICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9OR0NDX0NPTkZJRzogTmdjY1Byb2plY3RDb25maWcgPSB7XG4gIHBhY2thZ2VzOiB7XG4gICAgLy8gQWRkIGRlZmF1bHQgcGFja2FnZSBjb25maWd1cmF0aW9uIGhlcmUuIEZvciBleGFtcGxlOlxuICAgIC8vICdAYW5ndWxhci9maXJlQF41LjIuMCc6IHtcbiAgICAvLyAgIGVudHJ5UG9pbnRzOiB7XG4gICAgLy8gICAgICcuL2RhdGFiYXNlLWRlcHJlY2F0ZWQnOiB7aWdub3JlOiB0cnVlfSxcbiAgICAvLyAgIH0sXG4gICAgLy8gfSxcblxuICAgIC8vIFRoZSBwYWNrYWdlIGRvZXMgbm90IGNvbnRhaW4gYW55IGAubWV0YWRhdGEuanNvbmAgZmlsZXMgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IGJ1dCBvbmx5IGluc2lkZVxuICAgIC8vIGBkaXN0L2AuIFdpdGhvdXQgdGhpcyBjb25maWcsIG5nY2MgZG9lcyBub3QgcmVhbGl6ZSB0aGlzIGlzIGEgVmlld0VuZ2luZS1idWlsdCBBbmd1bGFyXG4gICAgLy8gcGFja2FnZSB0aGF0IG5lZWRzIHRvIGJlIGNvbXBpbGVkIHRvIEl2eS5cbiAgICAnYW5ndWxhcjItaGlnaGNoYXJ0cyc6IHtcbiAgICAgIGVudHJ5UG9pbnRzOiB7XG4gICAgICAgICcuJzoge1xuICAgICAgICAgIG92ZXJyaWRlOiB7XG4gICAgICAgICAgICBtYWluOiAnLi9pbmRleC5qcycsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIFRoZSBgZGlzdC9gIGRpcmVjdG9yeSBoYXMgYSBkdXBsaWNhdGUgYHBhY2thZ2UuanNvbmAgcG9pbnRpbmcgdG8gdGhlIHNhbWUgZmlsZXMsIHdoaWNoICh1bmRlclxuICAgIC8vIGNlcnRhaW4gY29uZmlndXJhdGlvbnMpIGNhbiBjYXVzZXMgbmdjYyB0byB0cnkgdG8gcHJvY2VzcyB0aGUgZmlsZXMgdHdpY2UgYW5kIGZhaWwuXG4gICAgLy8gSWdub3JlIHRoZSBgZGlzdC9gIGVudHJ5LXBvaW50LlxuICAgICduZzItZHJhZ3VsYSc6IHtcbiAgICAgIGVudHJ5UG9pbnRzOiB7XG4gICAgICAgICcuL2Rpc3QnOiB7aWdub3JlOiB0cnVlfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgbG9ja2luZzoge1xuICAgIHJldHJ5RGVsYXk6IDUwMCxcbiAgICByZXRyeUF0dGVtcHRzOiA1MDAsXG4gIH1cbn07XG5cbmNvbnN0IE5HQ0NfQ09ORklHX0ZJTEVOQU1FID0gJ25nY2MuY29uZmlnLmpzJztcblxuLyoqXG4gKiBUaGUgcHJvY2Vzc2VkIHBhY2thZ2UgbGV2ZWwgY29uZmlndXJhdGlvbiBhcyBhIHJlc3VsdCBvZiBwcm9jZXNzaW5nIGEgcmF3IHBhY2thZ2UgbGV2ZWwgY29uZmlnLlxuICovXG5leHBvcnQgY2xhc3MgUHJvY2Vzc2VkTmdjY1BhY2thZ2VDb25maWcgaW1wbGVtZW50cyBPbWl0PFJhd05nY2NQYWNrYWdlQ29uZmlnLCAnZW50cnlQb2ludHMnPiB7XG4gIC8qKlxuICAgKiBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGlzIGluc3RhbmNlIG9mIHRoZSBwYWNrYWdlLlxuICAgKiBOb3RlIHRoYXQgdGhlcmUgbWF5IGJlIG11bHRpcGxlIGluc3RhbmNlcyBvZiBhIHBhY2thZ2UgaW5zaWRlIGEgcHJvamVjdCBpbiBuZXN0ZWRcbiAgICogYG5vZGVfbW9kdWxlcy9gLiBGb3IgZXhhbXBsZSwgb25lIGF0IGA8cHJvamVjdC1yb290Pi9ub2RlX21vZHVsZXMvc29tZS1wYWNrYWdlL2AgYW5kIG9uZSBhdFxuICAgKiBgPHByb2plY3Qtcm9vdD4vbm9kZV9tb2R1bGVzL290aGVyLXBhY2thZ2Uvbm9kZV9tb2R1bGVzL3NvbWUtcGFja2FnZS9gLlxuICAgKi9cbiAgcGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoO1xuXG4gIC8qKlxuICAgKiBUaGUgZW50cnktcG9pbnRzIHRvIGNvbmZpZ3VyZSBmb3IgdGhpcyBwYWNrYWdlLlxuICAgKlxuICAgKiBJbiBjb250cmFzdCB0byBgUmF3TmdjY1BhY2thZ2VDb25maWdgLCB0aGUgcGF0aHMgYXJlIGFic29sdXRlIGFuZCB0YWtlIHRoZSBwYXRoIG9mIHRoZSBzcGVjaWZpY1xuICAgKiBpbnN0YW5jZSBvZiB0aGUgcGFja2FnZSBpbnRvIGFjY291bnQuXG4gICAqL1xuICBlbnRyeVBvaW50czogTWFwPEFic29sdXRlRnNQYXRoLCBOZ2NjRW50cnlQb2ludENvbmZpZz47XG5cbiAgLyoqXG4gICAqIEEgY29sbGVjdGlvbiBvZiByZWdleGVzIHRoYXQgbWF0Y2ggZGVlcCBpbXBvcnRzIHRvIGlnbm9yZSwgZm9yIHRoaXMgcGFja2FnZSwgcmF0aGVyIHRoYW5cbiAgICogZGlzcGxheWluZyBhIHdhcm5pbmcuXG4gICAqL1xuICBpZ25vcmFibGVEZWVwSW1wb3J0TWF0Y2hlcnM6IFJlZ0V4cFtdO1xuXG4gIGNvbnN0cnVjdG9yKGZzOiBQYXRoTWFuaXB1bGF0aW9uLCBwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHtcbiAgICBlbnRyeVBvaW50cyA9IHt9LFxuICAgIGlnbm9yYWJsZURlZXBJbXBvcnRNYXRjaGVycyA9IFtdLFxuICB9OiBSYXdOZ2NjUGFja2FnZUNvbmZpZykge1xuICAgIGNvbnN0IGFic29sdXRlUGF0aEVudHJpZXM6IFtBYnNvbHV0ZUZzUGF0aCwgTmdjY0VudHJ5UG9pbnRDb25maWddW10gPVxuICAgICAgICBPYmplY3QuZW50cmllcyhlbnRyeVBvaW50cykubWFwKChbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWxhdGl2ZVBhdGgsIGNvbmZpZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0pID0+IFtmcy5yZXNvbHZlKHBhY2thZ2VQYXRoLCByZWxhdGl2ZVBhdGgpLCBjb25maWddKTtcblxuICAgIHRoaXMucGFja2FnZVBhdGggPSBwYWNrYWdlUGF0aDtcbiAgICB0aGlzLmVudHJ5UG9pbnRzID0gbmV3IE1hcChhYnNvbHV0ZVBhdGhFbnRyaWVzKTtcbiAgICB0aGlzLmlnbm9yYWJsZURlZXBJbXBvcnRNYXRjaGVycyA9IGlnbm9yYWJsZURlZXBJbXBvcnRNYXRjaGVycztcbiAgfVxufVxuXG4vKipcbiAqIE5nY2MgaGFzIGEgaGllcmFyY2hpY2FsIGNvbmZpZ3VyYXRpb24gc3lzdGVtIHRoYXQgbGV0cyB1cyBcImZpeCB1cFwiIHBhY2thZ2VzIHRoYXQgZG8gbm90XG4gKiB3b3JrIHdpdGggbmdjYyBvdXQgb2YgdGhlIGJveC5cbiAqXG4gKiBUaGVyZSBhcmUgdGhyZWUgbGV2ZWxzIGF0IHdoaWNoIGNvbmZpZ3VyYXRpb24gY2FuIGJlIGRlY2xhcmVkOlxuICpcbiAqICogRGVmYXVsdCBsZXZlbCAtIG5nY2MgY29tZXMgd2l0aCBidWlsdC1pbiBjb25maWd1cmF0aW9uIGZvciB3ZWxsIGtub3duIGNhc2VzLlxuICogKiBQYWNrYWdlIGxldmVsIC0gYSBsaWJyYXJ5IGF1dGhvciBwdWJsaXNoZXMgYSBjb25maWd1cmF0aW9uIHdpdGggdGhlaXIgcGFja2FnZSB0byBmaXgga25vd25cbiAqICAgaXNzdWVzLlxuICogKiBQcm9qZWN0IGxldmVsIC0gdGhlIGFwcGxpY2F0aW9uIGRldmVsb3BlciBwcm92aWRlcyBhIGNvbmZpZ3VyYXRpb24gdGhhdCBmaXhlcyBpc3N1ZXMgc3BlY2lmaWNcbiAqICAgdG8gdGhlIGxpYnJhcmllcyB1c2VkIGluIHRoZWlyIGFwcGxpY2F0aW9uLlxuICpcbiAqIE5nY2Mgd2lsbCBtYXRjaCBjb25maWd1cmF0aW9uIGJhc2VkIG9uIHRoZSBwYWNrYWdlIG5hbWUgYnV0IGFsc28gb24gaXRzIHZlcnNpb24uIFRoaXMgYWxsb3dzXG4gKiBjb25maWd1cmF0aW9uIHRvIHByb3ZpZGUgZGlmZmVyZW50IGZpeGVzIHRvIGRpZmZlcmVudCB2ZXJzaW9uIHJhbmdlcyBvZiBhIHBhY2thZ2UuXG4gKlxuICogKiBQYWNrYWdlIGxldmVsIGNvbmZpZ3VyYXRpb24gaXMgc3BlY2lmaWMgdG8gdGhlIHBhY2thZ2UgdmVyc2lvbiB3aGVyZSB0aGUgY29uZmlndXJhdGlvbiBpc1xuICogICBmb3VuZC5cbiAqICogRGVmYXVsdCBhbmQgcHJvamVjdCBsZXZlbCBjb25maWd1cmF0aW9uIHNob3VsZCBwcm92aWRlIHZlcnNpb24gcmFuZ2VzIHRvIGVuc3VyZSB0aGF0IHRoZVxuICogICBjb25maWd1cmF0aW9uIGlzIG9ubHkgYXBwbGllZCB0byB0aGUgYXBwcm9wcmlhdGUgdmVyc2lvbnMgb2YgYSBwYWNrYWdlLlxuICpcbiAqIFdoZW4gZ2V0dGluZyBhIGNvbmZpZ3VyYXRpb24gZm9yIGEgcGFja2FnZSAodmlhIGBnZXRDb25maWcoKWApIHRoZSBjYWxsZXIgc2hvdWxkIHByb3ZpZGUgdGhlXG4gKiB2ZXJzaW9uIG9mIHRoZSBwYWNrYWdlIGluIHF1ZXN0aW9uLCBpZiBhdmFpbGFibGUuIElmIGl0IGlzIG5vdCBwcm92aWRlZCB0aGVuIHRoZSBmaXJzdCBhdmFpbGFibGVcbiAqIGNvbmZpZ3VyYXRpb24gZm9yIGEgcGFja2FnZSBpcyByZXR1cm5lZC5cbiAqL1xuZXhwb3J0IGNsYXNzIE5nY2NDb25maWd1cmF0aW9uIHtcbiAgcHJpdmF0ZSBkZWZhdWx0Q29uZmlnOiBQYXJ0aWFsbHlQcm9jZXNzZWRDb25maWc7XG4gIHByaXZhdGUgcHJvamVjdENvbmZpZzogUGFydGlhbGx5UHJvY2Vzc2VkQ29uZmlnO1xuICBwcml2YXRlIGNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIFZlcnNpb25lZFBhY2thZ2VDb25maWc+KCk7XG4gIHJlYWRvbmx5IGhhc2g6IHN0cmluZztcbiAgcmVhZG9ubHkgaGFzaEFsZ29yaXRobTogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZnM6IFJlYWRvbmx5RmlsZVN5c3RlbSwgYmFzZURpcjogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICB0aGlzLmRlZmF1bHRDb25maWcgPSBuZXcgUGFydGlhbGx5UHJvY2Vzc2VkQ29uZmlnKERFRkFVTFRfTkdDQ19DT05GSUcpO1xuICAgIHRoaXMucHJvamVjdENvbmZpZyA9IG5ldyBQYXJ0aWFsbHlQcm9jZXNzZWRDb25maWcodGhpcy5sb2FkUHJvamVjdENvbmZpZyhiYXNlRGlyKSk7XG4gICAgdGhpcy5oYXNoQWxnb3JpdGhtID0gdGhpcy5wcm9qZWN0Q29uZmlnLmhhc2hBbGdvcml0aG07XG4gICAgdGhpcy5oYXNoID0gdGhpcy5jb21wdXRlSGFzaCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgY29uZmlndXJhdGlvbiBvcHRpb25zIGZvciBsb2NraW5nIHRoZSBuZ2NjIHByb2Nlc3MuXG4gICAqL1xuICBnZXRMb2NraW5nQ29uZmlnKCk6IFJlcXVpcmVkPFByb2Nlc3NMb2NraW5nQ29uZmlndXJhdGlvbj4ge1xuICAgIGxldCB7cmV0cnlBdHRlbXB0cywgcmV0cnlEZWxheX0gPSB0aGlzLnByb2plY3RDb25maWcubG9ja2luZztcbiAgICBpZiAocmV0cnlBdHRlbXB0cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXRyeUF0dGVtcHRzID0gdGhpcy5kZWZhdWx0Q29uZmlnLmxvY2tpbmcucmV0cnlBdHRlbXB0cyE7XG4gICAgfVxuICAgIGlmIChyZXRyeURlbGF5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHJ5RGVsYXkgPSB0aGlzLmRlZmF1bHRDb25maWcubG9ja2luZy5yZXRyeURlbGF5ITtcbiAgICB9XG4gICAgcmV0dXJuIHtyZXRyeUF0dGVtcHRzLCByZXRyeURlbGF5fTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYSBjb25maWd1cmF0aW9uIGZvciB0aGUgZ2l2ZW4gYHZlcnNpb25gIG9mIGEgcGFja2FnZSBhdCBgcGFja2FnZVBhdGhgLlxuICAgKlxuICAgKiBAcGFyYW0gcGFja2FnZU5hbWUgVGhlIG5hbWUgb2YgdGhlIHBhY2thZ2Ugd2hvc2UgY29uZmlnIHdlIHdhbnQuXG4gICAqIEBwYXJhbSBwYWNrYWdlUGF0aCBUaGUgcGF0aCB0byB0aGUgcGFja2FnZSB3aG9zZSBjb25maWcgd2Ugd2FudC5cbiAgICogQHBhcmFtIHZlcnNpb24gVGhlIHZlcnNpb24gb2YgdGhlIHBhY2thZ2Ugd2hvc2UgY29uZmlnIHdlIHdhbnQsIG9yIGBudWxsYCBpZiB0aGUgcGFja2FnZSdzXG4gICAqIHBhY2thZ2UuanNvbiBkaWQgbm90IGV4aXN0IG9yIHdhcyBpbnZhbGlkLlxuICAgKi9cbiAgZ2V0UGFja2FnZUNvbmZpZyhwYWNrYWdlTmFtZTogc3RyaW5nLCBwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHZlcnNpb246IHN0cmluZ3xudWxsKTpcbiAgICAgIFByb2Nlc3NlZE5nY2NQYWNrYWdlQ29uZmlnIHtcbiAgICBjb25zdCByYXdQYWNrYWdlQ29uZmlnID0gdGhpcy5nZXRSYXdQYWNrYWdlQ29uZmlnKHBhY2thZ2VOYW1lLCBwYWNrYWdlUGF0aCwgdmVyc2lvbik7XG4gICAgcmV0dXJuIG5ldyBQcm9jZXNzZWROZ2NjUGFja2FnZUNvbmZpZyh0aGlzLmZzLCBwYWNrYWdlUGF0aCwgcmF3UGFja2FnZUNvbmZpZyk7XG4gIH1cblxuICBwcml2YXRlIGdldFJhd1BhY2thZ2VDb25maWcoXG4gICAgICBwYWNrYWdlTmFtZTogc3RyaW5nLCBwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICB2ZXJzaW9uOiBzdHJpbmd8bnVsbCk6IFZlcnNpb25lZFBhY2thZ2VDb25maWcge1xuICAgIGNvbnN0IGNhY2hlS2V5ID0gcGFja2FnZU5hbWUgKyAodmVyc2lvbiAhPT0gbnVsbCA/IGBAJHt2ZXJzaW9ufWAgOiAnJyk7XG4gICAgaWYgKHRoaXMuY2FjaGUuaGFzKGNhY2hlS2V5KSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGUuZ2V0KGNhY2hlS2V5KSE7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvamVjdExldmVsQ29uZmlnID0gdGhpcy5wcm9qZWN0Q29uZmlnLmZpbmRQYWNrYWdlQ29uZmlnKHBhY2thZ2VOYW1lLCB2ZXJzaW9uKTtcbiAgICBpZiAocHJvamVjdExldmVsQ29uZmlnICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmNhY2hlLnNldChjYWNoZUtleSwgcHJvamVjdExldmVsQ29uZmlnKTtcbiAgICAgIHJldHVybiBwcm9qZWN0TGV2ZWxDb25maWc7XG4gICAgfVxuXG4gICAgY29uc3QgcGFja2FnZUxldmVsQ29uZmlnID0gdGhpcy5sb2FkUGFja2FnZUNvbmZpZyhwYWNrYWdlUGF0aCwgdmVyc2lvbik7XG4gICAgaWYgKHBhY2thZ2VMZXZlbENvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jYWNoZS5zZXQoY2FjaGVLZXksIHBhY2thZ2VMZXZlbENvbmZpZyk7XG4gICAgICByZXR1cm4gcGFja2FnZUxldmVsQ29uZmlnO1xuICAgIH1cblxuICAgIGNvbnN0IGRlZmF1bHRMZXZlbENvbmZpZyA9IHRoaXMuZGVmYXVsdENvbmZpZy5maW5kUGFja2FnZUNvbmZpZyhwYWNrYWdlTmFtZSwgdmVyc2lvbik7XG4gICAgaWYgKGRlZmF1bHRMZXZlbENvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jYWNoZS5zZXQoY2FjaGVLZXksIGRlZmF1bHRMZXZlbENvbmZpZyk7XG4gICAgICByZXR1cm4gZGVmYXVsdExldmVsQ29uZmlnO1xuICAgIH1cblxuICAgIHJldHVybiB7dmVyc2lvblJhbmdlOiAnKid9O1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkUHJvamVjdENvbmZpZyhiYXNlRGlyOiBBYnNvbHV0ZUZzUGF0aCk6IE5nY2NQcm9qZWN0Q29uZmlnIHtcbiAgICBjb25zdCBjb25maWdGaWxlUGF0aCA9IHRoaXMuZnMuam9pbihiYXNlRGlyLCBOR0NDX0NPTkZJR19GSUxFTkFNRSk7XG4gICAgaWYgKHRoaXMuZnMuZXhpc3RzKGNvbmZpZ0ZpbGVQYXRoKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZXZhbFNyY0ZpbGUoY29uZmlnRmlsZVBhdGgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcHJvamVjdCBjb25maWd1cmF0aW9uIGZpbGUgYXQgXCIke2NvbmZpZ0ZpbGVQYXRofVwiOiBgICsgZS5tZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtwYWNrYWdlczoge319O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbG9hZFBhY2thZ2VDb25maWcocGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCB2ZXJzaW9uOiBzdHJpbmd8bnVsbCk6XG4gICAgICBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnfG51bGwge1xuICAgIGNvbnN0IGNvbmZpZ0ZpbGVQYXRoID0gdGhpcy5mcy5qb2luKHBhY2thZ2VQYXRoLCBOR0NDX0NPTkZJR19GSUxFTkFNRSk7XG4gICAgaWYgKHRoaXMuZnMuZXhpc3RzKGNvbmZpZ0ZpbGVQYXRoKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcGFja2FnZUNvbmZpZyA9IHRoaXMuZXZhbFNyY0ZpbGUoY29uZmlnRmlsZVBhdGgpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC4uLnBhY2thZ2VDb25maWcsXG4gICAgICAgICAgdmVyc2lvblJhbmdlOiB2ZXJzaW9uIHx8ICcqJyxcbiAgICAgICAgfTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHBhY2thZ2UgY29uZmlndXJhdGlvbiBmaWxlIGF0IFwiJHtjb25maWdGaWxlUGF0aH1cIjogYCArIGUubWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZXZhbFNyY0ZpbGUoc3JjUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBhbnkge1xuICAgIGNvbnN0IHNyYyA9IHRoaXMuZnMucmVhZEZpbGUoc3JjUGF0aCk7XG4gICAgY29uc3QgdGhlRXhwb3J0cyA9IHt9O1xuICAgIGNvbnN0IHNhbmRib3ggPSB7XG4gICAgICBtb2R1bGU6IHtleHBvcnRzOiB0aGVFeHBvcnRzfSxcbiAgICAgIGV4cG9ydHM6IHRoZUV4cG9ydHMsXG4gICAgICByZXF1aXJlLFxuICAgICAgX19kaXJuYW1lOiB0aGlzLmZzLmRpcm5hbWUoc3JjUGF0aCksXG4gICAgICBfX2ZpbGVuYW1lOiBzcmNQYXRoXG4gICAgfTtcbiAgICB2bS5ydW5Jbk5ld0NvbnRleHQoc3JjLCBzYW5kYm94LCB7ZmlsZW5hbWU6IHNyY1BhdGh9KTtcbiAgICByZXR1cm4gc2FuZGJveC5tb2R1bGUuZXhwb3J0cztcbiAgfVxuXG4gIHByaXZhdGUgY29tcHV0ZUhhc2goKTogc3RyaW5nIHtcbiAgICByZXR1cm4gY3JlYXRlSGFzaCh0aGlzLmhhc2hBbGdvcml0aG0pLnVwZGF0ZSh0aGlzLnByb2plY3RDb25maWcudG9Kc29uKCkpLmRpZ2VzdCgnaGV4Jyk7XG4gIH1cbn1cbiJdfQ==