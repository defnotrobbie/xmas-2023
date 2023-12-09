import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, ScanCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/** @type {Config} */
const CONFIG = JSON.parse(process.env.CONFIG);

/** @type {Tables} */
const TABLES = JSON.parse(process.env.TABLES);

const PASSPHRASE = process.env.PASSPHRASE;

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: {
        removeUndefinedValues: true,
    },
});

/** @type {AssertItems} */
function assertItems(items, tableConfig) {
    const keys = tableConfig.KEYS;
    const satisfied = items.every(el => keys.every(key => key in el));
    if (!satisfied) {
        throw new Error(`table does not contain ${keys}`);
    }
}

/** @type {FetchTable} */
function fetchTable(tableConfig) {
    return docClient.send(
        new ScanCommand({
            TableName: tableConfig.NAME,
            FilterExpression: 'disabled <> :disabled',
            ExpressionAttributeValues: { ':disabled': true },
        })
    );
}

/** @type {GetItems} */
async function getItems(tableConfig) {
    const items = (await fetchTable(tableConfig)).Items ?? [];
    assertItems(items, tableConfig);
    return items;
}

const save = item =>
    docClient.send(
        new PutCommand({
            TableName: TABLES[CONFIG.TABLE_A].NAME,
            Item: item,
        })
    );

/**
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

/** @type {MakeItemMap} */
async function makeItemMap(tableConfig) {
    const items = await getItems(tableConfig);

    let mapParams = items.map(item => /** @type {const} */ ([item[tableConfig.PK], item]));

    return new Map(mapParams);
}

/** @type {FilterMap} */
const filterMap = (map, filterCb, mapCb) => Array.from(map.values()).filter(filterCb).map(mapCb);

/** @type {DerivePool} */
function derivePool(x, tableB, tableA) {
    const b2 = tableB.get(x)?.[TABLES[CONFIG.TABLE_B]['AK']];

    const members = filterMap(
        tableB,
        p => p?.[TABLES[CONFIG.TABLE_B]['AK']] === b2,
        p => p?.[TABLES[CONFIG.TABLE_B]['PK']]
    );

    const assigned = filterMap(
        tableA,
        a => !!a?.[TABLES[CONFIG.TABLE_A]['AK']],
        a => a?.[TABLES[CONFIG.TABLE_A]['AK']]
    );

    const exclusions = new Set([x, ...assigned, ...members]);

    const pool = filterMap(
        tableB,
        p => !exclusions.has(p[TABLES[CONFIG.TABLE_B]['PK']]),
        p => p[TABLES[CONFIG.TABLE_B]['PK']]
    );

    return pool;
}

async function handleEvent2(x) {
    x = x?.toLocaleLowerCase();
    const itemAMap = await makeItemMap(TABLES[CONFIG.TABLE_A]);
    const itemA = itemAMap.get(x) || {
        [TABLES[CONFIG.TABLE_A]['PK']]: x,
        [TABLES[CONFIG.TABLE_A]['AK']]: undefined,
    };

    if (itemA[TABLES[CONFIG.TABLE_A]['AK']])
        return {
            statusCode: 200,
            headers: { 'content-type': 'application/json' },
            body: itemA,
        };

    const itemBMap = await makeItemMap(TABLES[CONFIG.TABLE_B]);
    const pool = derivePool(x, itemBMap, itemAMap);

    itemA[TABLES[CONFIG.TABLE_A]['AK']] = pool[randomInt(0, pool.length - 1)];
    const response = await save(itemA);

    if (response.$metadata.httpStatusCode !== 200) {
        throw new Error('' + response.$metadata.httpStatusCode);
    }

    return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: itemA,
    };
}

async function handleEvent3(x) {
    const results = [];
    for (const itemAPK of x) {
        results.push((await handleEvent2(itemAPK)).body);
    }
    return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: results,
    };
}

async function handleEvent1() {
    const participants = await makeItemMap(TABLES[CONFIG.TABLE_B]);
    return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: { list: Array.from(participants.keys()) },
    };
}

export const handler = async event => {
    const body = JSON.parse(event.body);
    const passphrase = body.passphrase?.toLocaleLowerCase();
    if (passphrase !== PASSPHRASE) {
        return { statusCode: 401 };
    } else if (body[CONFIG.EVENT_1]) {
        return await handleEvent1();
    } else if (body[CONFIG.EVENT_2]) {
        return await handleEvent2(body[CONFIG.EVENT_2]);
    } else if (body[CONFIG.EVENT_3]) {
        return await handleEvent3(body[CONFIG.EVENT_3]);
    } else {
        return { statusCode: 500 };
    }
};
