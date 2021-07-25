var addon = require('bindings')('addon.node')
function demangle(name) {
    return addon.demangle(name);
}

class CppDemangler {
    async demangle(mangledName) {
        return demangle(mangledName);
    }
    exit() {}
}
module.exports = CppDemangler;
module.exports.demangle = demangle;

function testInteractively() {
    const input = '_ZZZN7android4Hwc24impl8Composer7executeEvENK4$_15clINS_8hardware8graphics8composer4V2_15ErrorEbjNS5_8hidl_vecINS5_11hidl_handleEEEEEDaRKT_RKT0_RKT1_RKT2_ENKUlSG_SJ_E_clIS9_NS5_12MQDescriptorIjLNS5_8MQFlavorE1EEEEESD_SG_SJ_'
    const output = demangle(input);
    console.log(input);
    console.log(output);

    const input2 = '__on_dlclose';
    const output2 = demangle(input2);
    console.log(input2, output2);
}
if (require.main === module) {
    console.log('called directly');
    testInteractively();
}
