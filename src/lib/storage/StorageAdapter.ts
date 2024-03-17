export abstract class StorageAdapter {
    static create(...args : any[]) : Promise<StorageAdapter> {
        throw new Error("This StorageAdapter method must be overridden.");
    }

    public abstract init(): Promise<void>;

    public abstract readJson(): Promise<string>;

    public abstract writeJson(contents: string): Promise<void>;
}