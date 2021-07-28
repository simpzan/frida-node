const assert = require('assert');
const log = console.log.bind(console, 'tests');
const utils = require('./utils.js');

const tests = {
    testMakeMapOk() {
        const keys = [1, 2, 3], values = ["one", "two", "three"];
        const actual = utils.makeMap(keys, values);
        const expected = new Map([
            [1, 'one'],
            [2, 'two'],
            [3, 'three'],
        ]);
        assert.deepStrictEqual(actual, expected);
    },
    testMakeMapFail() {
        const array1 = [1, 2, 3], array2 = ["one", "two"];
        assert.throws(() => utils.makeMap(array1, array2));
        assert.throws(() => utils.makeMap(array2, array1));
    },
    testSaveLoadObject() {
        const expected = { name: 'zan', age: 30 };
        const filename = '/tmp/utils.test.json';
        utils.saveObject(expected, filename);
        const actual = utils.loadObject(filename);
        assert.deepStrictEqual(actual, expected);
    },
    async testDelay() {
        const ts1 = Date.now();
        const expected = 500;
        await utils.delay(expected);
        const actual = Date.now() - ts1;
        assert.ok(Math.abs(expected - actual) < 10, `actual ${actual}, expected ${expected}`);
    }
};

async function main() {
    const keys = Object.keys(tests);
    const count = keys.length;
    for (const [index, key] of keys.entries()) {
        log(`${index+1}/${count} running test '${key}'`);
        const test = tests[key];
        await test();
    }
    log('all done!');
}
main();
