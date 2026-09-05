"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSosSignal = handleSosSignal;
function handleSosSignal(vehicleId, details) {
    return {
        vehicleId,
        type: 'sos',
        severity: 'critical',
        details: details ?? { trigger: 'in_cab_button_press' },
        raisedAt: new Date().toISOString(),
    };
}
