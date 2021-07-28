
const frida = require('../../build/frida-macos-x86_64/lib/node_modules/frida');
const fs = require('fs');
const utils = require('./utils.js');
// const CppDemangler = require('./CppDemangler.js');
const CppDemangler = require('./CppDemangler.node');

let functions = [];
let events = [];
function onMessageFromDebuggee(msg) {
    const type = msg.payload.type;
    if (type === 'functions') {
        functions = msg.payload.functions;
    } else if (type === 'events') {
        events = events.concat(msg.payload.events);
    } else {
        log.e(`unkown msg`, msg);
    }
}

async function demangleFunctionNames() {
    log.i(`demangle function names`);
    const functionMap = new Map()
    const demangler = new CppDemangler();
    for (const fn of functions) {
        fn.demangledName = await demangler.demangle(fn.name);
        functionMap.set(fn.address, fn);
    }
    demangler.exit();
    return functionMap;
}

class ChromeTracingFile {
    constructor(filename) {
        this.sink = fs.createWriteStream(filename);
        this.sink.write("[\n");
    }
    writeObject(obj) {
        this.sink.write(JSON.stringify(obj));
        this.sink.write(",\n");
    }
    close() {
        this.sink.write("{}]\n");
        this.sink.end();
    }
}
function writeChromeTracingFile(filename, functionMap) {
    log.i(`writing chrome tracing file ${filename}`);
    const traceFile = new ChromeTracingFile(filename);
    const tids = new Set();
    for (const trace of events) {
        tids.add(trace.tid);
        const fn = functionMap.get(trace.addr);
        trace.name = fn.demangledName || fn.name;
        traceFile.writeObject(trace);
    }
    const pid = events[0].pid;
    for (const tid of tids) {
        const threadName = utils.getThreadName(pid, tid);
        const name = `${threadName}/${tid}`;
        const entry = {"ts":0, "ph":"M", "name":"thread_name", pid, tid, "args":{name}};
        traceFile.writeObject(entry);
    }
    traceFile.close();
}
async function attachProcess(processName, sourceFilename) {
    const device = await frida.getUsbDevice();
    if (!device) return log.e('no usb device found.');

    log.i(`tracing process ${processName}`);
    const session = await device.attach(processName);
    const source = fs.readFileSync(sourceFilename, "utf8");
    const script = await session.createScript(source, { runtime: 'v8' });
    script.message.connect(onMessageFromDebuggee);
    await script.load();
    return script;
}

async function main() {
    const argv = process.argv;
    log.i("argv", argv);

    const processName = argv[2] || "com.example.myapplication";
    const libName = argv[3] || "libnative-lib.so";
    const sourceFilename = "./tracee.js";

    const script = await attachProcess(processName, sourceFilename);
    await script.exports.startTracing(libName);
    log.i('Tracing started, press enter to stop.');

    const stdin = new utils.StdIn();
    await stdin.getline();
    stdin.destroy();

    await script.exports.stopTracing();
    script.unload();

    if (!events.length) return log.i('no trace data.');

    const functionMap = await demangleFunctionNames();
    writeChromeTracingFile(`${libName}.json`, functionMap);
    log.i('tracing done!');
};
main();
