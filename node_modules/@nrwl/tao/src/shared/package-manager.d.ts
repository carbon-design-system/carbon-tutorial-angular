export declare type PackageManager = 'yarn' | 'pnpm' | 'npm';
export interface PackageManagerCommands {
    install: string;
    add: string;
    addDev: string;
    rm: string;
    exec: string;
    list: string;
    run: (script: string, args: string) => string;
}
/**
 * Detects which package manager is used in the workspace based on the lock file.
 */
export declare function detectPackageManager(dir?: string): PackageManager;
/**
 * Returns commands for the package manager used in the workspace.
 * By default, the package manager is derived based on the lock file,
 * but it can also be passed in explicitly.
 *
 * Example:
 *
 * ```javascript
 * execSync(`${getPackageManagerCommand().addDev} my-dev-package`);
 * ```
 */
export declare function getPackageManagerCommand(packageManager?: PackageManager): PackageManagerCommands;
/**
 * Returns the version of the package manager used in the workspace.
 * By default, the package manager is derived based on the lock file,
 * but it can also be passed in explicitly.
 */
export declare function getPackageManagerVersion(packageManager?: PackageManager): string;
