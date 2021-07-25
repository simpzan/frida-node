const { saveObject, loadObject } = require("./utils.js");
const filename = "demangler.json";

class CppDemangler {
    constructor() {
        const { spawn } = require('child_process');
        const p = spawn('/usr/local/bin/adb', ['shell', '-t', '-t', '/data/data/com.termux/files/usr/bin/c++filt' ]);
        p.on('error', err => log.e("process error", err));
        p.stderr.on('data', data => log.e("stderr", data.toString()));
        this.p = p;

        let lastStdoutString = "";
        let i = 0;
        this.p.stdout.on('data', data => {
            const str = data.toString();
            // log.d(++i, str);
            lastStdoutString += str;

            if (lastStdoutString.length > this.inputLen + 2 && lastStdoutString.endsWith('\n')) {
                const fn = lastStdoutString.substring(this.inputLen + 1, lastStdoutString.length-1);
                
                // log.d(`output ${fn}`)
                this.cache[this.input] = fn;
                this.resolve(fn);
                this.resolve = null;
                lastStdoutString = "";
                i = 0;
            }
        });
        this.cache = loadObject(filename) || {};
    }
    async demangle(mangledName) {
        return new Promise((resolve, reject) => {
            if (this.resolve) return reject("last request are still processing.");
            const cached = this.cache[mangledName];
            if (cached) return resolve(cached);
            this.resolve = resolve;
            // log.d(`input "${mangledName}"`);
            const input = mangledName + "\n";
            this.inputLen = input.length
            this.input = mangledName;
            this.p.stdin.write(input); 
        });
    }
    exit() {
        this.p.kill();
        saveObject(this.cache, filename);
    }
}

async function testInteractively() {
    const demangler = new CppDemangler();
    const ss = [ '_ZNSt3__16__treeINS_12__value_typeIiN7android3pdx3rpc7VariantIJilbfNS_5arrayIfLm2EEENS6_IfLm3EEENS6_IfLm4EEENS6_IfLm8EEENS6_IfLm16EEEEEEEENS_19__map_value_compareIiSD_NS_4lessIiEELb1EEENS_9allocatorISD_EEE30__emplace_hint_unique_key_argsIiJRKNS_4pairIKiSC_EEEEENS_15__tree_iteratorISD_PNS_11__tree_nodeISD_PvEElEENS_21__tree_const_iteratorISD_SV_lEERKT_DpOT0_',
     '_ZZZN7android4Hwc24impl8Composer7executeEvENK4$_15clINS_8hardware8graphics8composer4V2_15ErrorEbjNS5_8hidl_vecINS5_11hidl_handleEEEEEDaRKT_RKT0_RKT1_RKT2_ENKUlSG_SJ_E_clIS9_NS5_12MQDescriptorIjLNS5_8MQFlavorE1EEEEESD_SG_SJ_',
      '_ZN7android6ClientD2Ev'];
    for (let addr of ss) {
        const fn = await demangler.demangle(addr);
        log.i(addr);
        log.i(fn);
        log.d("");
    }
    demangler.exit();
}

if (require.main === module) {
    console.log('called directly');
    testInteractively();
} else {
    module.exports = CppDemangler;
}

