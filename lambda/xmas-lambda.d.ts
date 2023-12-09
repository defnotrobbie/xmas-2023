type Config = import('../secret/secrets.js').Config;

type Tables = import('../secret/secrets.js').Tables;

type Keys<T extends Tables[keyof Tables]> = T['KEYS'][number];

type Item<T extends Tables[keyof Tables]> = Partial<Record<Keys<T>, string>>;

type ItemMap<T extends Tables[keyof Tables]> = Map<Item<T>[T['PK']], Item<T>>;

type FetchTable = <K extends keyof Tables>(tableConfig: Tables[K]) => Promise<ScanCommandOutput>;

type AssertItems = <K extends keyof Tables>(
    items: Record<string, any>[],
    tableConfig: Tables[K]
) => asserts items is Item<Tables[K]>[];

type GetItems = <K extends keyof Tables>(tableConfig: Tables[K]) => Promise<Item<Tables[K]>[]>;

type MakeItemMap = <T extends Tables[keyof Tables]>(tableConfig: T) => Promise<ItemMap<T>>;

type DerivePool = (
    name: string,
    participants: ItemMap<Tables[TableB]>,
    assignments: ItemMap<Tables[TableA]>
) => string[];

type FilterMap = <T, U>(map: Map<string, T>, filterCb: (t: T) => boolean, mapCb: (t: T) => U) => U[];
