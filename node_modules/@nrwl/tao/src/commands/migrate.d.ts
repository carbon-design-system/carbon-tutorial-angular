declare type Dependencies = 'dependencies' | 'devDependencies';
export declare type MigrationsJson = {
    version: string;
    collection?: string;
    generators?: {
        [name: string]: {
            version: string;
            description?: string;
            cli?: string;
        };
    };
    packageJsonUpdates?: {
        [name: string]: {
            version: string;
            packages: {
                [p: string]: {
                    version: string;
                    ifPackageInstalled?: string;
                    alwaysAddToPackageJson?: boolean;
                    addToPackageJson?: Dependencies;
                };
            };
        };
    };
};
export declare function normalizeVersion(version: string): string;
export declare class Migrator {
    private readonly packageJson;
    private readonly versions;
    private readonly fetch;
    private readonly from;
    private readonly to;
    constructor(opts: {
        packageJson: any;
        versions: (p: string) => string;
        fetch: (p: string, v: string) => Promise<MigrationsJson>;
        from: {
            [p: string]: string;
        };
        to: {
            [p: string]: string;
        };
    });
    updatePackageJson(targetPackage: string, targetVersion: string): Promise<{
        packageJson: any;
        migrations: {
            package: string;
            name: string;
            version: string;
            description?: string;
            cli?: string;
        }[];
    }>;
    private _createMigrateJson;
    private _updatePackageJson;
    private collapsePackages;
    private gt;
    private lte;
}
declare type GenerateMigrations = {
    type: 'generateMigrations';
    targetPackage: string;
    targetVersion: string;
    from: {
        [k: string]: string;
    };
    to: {
        [k: string]: string;
    };
};
declare type RunMigrations = {
    type: 'runMigrations';
    runMigrations: string;
};
export declare function parseMigrationsOptions(args: string[]): GenerateMigrations | RunMigrations;
export declare function migrate(root: string, args: string[], isVerbose?: boolean): Promise<any>;
export {};
