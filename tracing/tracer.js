
const frida = require('../../build/frida-macos-x86_64/lib/node_modules/frida');
const fs = require('fs');
const utils = require('./utils.js');
// const CppDemangler = require('./CppDemangler.js');
const CppDemangler = require('./CppDemangler.node');

const functions = {};
let events = [];
function onMessageFromDebuggee(msg) {
    const type = msg.payload.type;
    if (type === 'functions') {
        for (const fn of msg.payload.functions) {
            functions[fn.address] = fn;
        }
    } else if (type === 'events') {
        events = events.concat(msg.payload.events);
    } else {
        log.e(`unkown msg`, msg);
    }
}

async function demangleFunctionNames() {
    log.i(`demangle function names`);
    const demangler = new CppDemangler();
    for (const key in functions) {
        if (Object.hasOwnProperty.call(functions, key)) {
            const fn = functions[key];
            fn.demangledName = await demangler.demangle(fn.name);
        }
    }
    demangler.exit();
}
function writeChromeTracingFile(filename) {
    log.i(`writing chrome tracing file ${filename}`);
    const sink = fs.createWriteStream(filename);
    sink.write("[\n");
    for (const trace of events) {
        const fn = functions[trace.addr];
        trace.name = fn.demangledName || fn.name;
        trace.ts = trace.ts * 1000;
        sink.write(JSON.stringify(trace));
        sink.write(",\n");
    }
    sink.write("{}]\n");
    sink.end();
}

async function main() {
    const argv = process.argv;
    log.i("argv", argv);
    const processName = argv[2] || "com.example.myapplication";
    const libName = argv[3] || "libnative-lib.so";

    const device = await frida.getUsbDevice();
    if (!device) return log.e('no usb device found.');

    log.i(`tracing process ${processName}`);
    const session = await device.attach(processName);
    const source = fs.readFileSync("./tracee.js", "utf8");
    const script = await session.createScript(source);
    script.message.connect(onMessageFromDebuggee);
    await script.load();

    script.post({ type: 'startTracing', libName });
    log.i('Tracing started, press enter to stop.');

    const stdin = new utils.StdIn();
    await stdin.getline();
    stdin.destroy();

    script.post({ type: 'stopTracing', libName });
    script.unload();

    await demangleFunctionNames();

    writeChromeTracingFile(`${libName}.json`);
    log.i('tracing done!');
};
main();
