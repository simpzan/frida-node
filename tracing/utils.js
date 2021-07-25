const log = console.log.bind(console);
// const log = {};
log.e = console.error.bind(console, "E");
log.w = console.warn.bind(console, "W");
log.i = console.info.bind(console, "I");
log.d = console.debug.bind(console, "D");
log.v = console.log.bind(console, "V");
const noop = () => { };
// log.d = noop;
log.v = noop;
global.log = log;

function delay(seconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, seconds);
    });
}

class StdIn {
    constructor() {
        var readline = require('readline');
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });
    }
    getline = () => new Promise((resolve, reject) => {
        this.rl.once('line', resolve);
    });
    destroy() {
        this.rl.close();
    }
}

const fs = require('fs');
function saveObject(obj, filename) {
    const str = JSON.stringify(obj);
    fs.writeFileSync(filename, str);
}
function loadObject(filename) {
    try {
        const str = fs.readFileSync(filename, 'utf8');
        return JSON.parse(str);
    } catch (error) {
        return null;
    }
}

function run(cmd) {
    try {
        console.info(`cmd: ${cmd}`);
        const cp = require("child_process");
        const output = cp.execSync(cmd);
        const result = output.toString("utf8");
        console.info(`result:\n${result}`);
        return result.trim();
    } catch (err) {
        return null;
    }
}
function getThreadName(pid, tid) {
    const cmd = `adb shell cat /proc/${pid}/task/${tid}/comm`;
    return run(cmd);
}
function testInteractively() {
    const name = getThreadName(3924, 4140);
    log(name);
}

if (require.main === module) {
    console.log('called directly');
    testInteractively();
}


module.exports = { delay, StdIn, saveObject, loadObject, getThreadName };
