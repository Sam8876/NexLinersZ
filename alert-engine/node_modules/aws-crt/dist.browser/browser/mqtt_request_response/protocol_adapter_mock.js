"use strict";
/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protocolAdapterApiCallSequenceContainsApiCalls = exports.protocolAdapterApiCallSequenceContainsApiCall = exports.subscriptionManagerEventSequenceContainsEvents = exports.subscriptionManagerEventSequenceContainsEvent = exports.MockProtocolAdapter = void 0;
var protocol_adapter = __importStar(require("./protocol_adapter"));
var event_1 = require("../../common/event");
var MockProtocolAdapter = /** @class */ (function (_super) {
    __extends(MockProtocolAdapter, _super);
    function MockProtocolAdapter(options) {
        var _this = _super.call(this) || this;
        _this.options = options;
        _this.apiCalls = new Array();
        _this.connectionState = protocol_adapter.ConnectionState.Disconnected;
        return _this;
    }
    // ProtocolAdapter API
    MockProtocolAdapter.prototype.close = function () {
    };
    MockProtocolAdapter.prototype.publish = function (publishOptions) {
        this.apiCalls.push({
            methodName: "publish",
            args: publishOptions
        });
        if (this.options && this.options.publishHandler) {
            this.options.publishHandler(this, publishOptions, this.options.publishHandlerContext);
        }
    };
    MockProtocolAdapter.prototype.subscribe = function (subscribeOptions) {
        this.apiCalls.push({
            methodName: "subscribe",
            args: subscribeOptions
        });
        if (this.options && this.options.subscribeHandler) {
            this.options.subscribeHandler(this, subscribeOptions, this.options.subscribeHandlerContext);
        }
    };
    MockProtocolAdapter.prototype.unsubscribe = function (unsubscribeOptions) {
        this.apiCalls.push({
            methodName: "unsubscribe",
            args: unsubscribeOptions
        });
        if (this.options && this.options.unsubscribeHandler) {
            this.options.unsubscribeHandler(this, unsubscribeOptions, this.options.unsubscribeHandlerContext);
        }
    };
    // Internal Testing API
    MockProtocolAdapter.prototype.connect = function (joinedSession) {
        if (this.connectionState === protocol_adapter.ConnectionState.Disconnected) {
            this.connectionState = protocol_adapter.ConnectionState.Connected;
            this.emit('connectionStatus', {
                status: protocol_adapter.ConnectionState.Connected,
                joinedSession: joinedSession
            });
        }
    };
    MockProtocolAdapter.prototype.disconnect = function () {
        if (this.connectionState === protocol_adapter.ConnectionState.Connected) {
            this.connectionState = protocol_adapter.ConnectionState.Disconnected;
            this.emit('connectionStatus', {
                status: protocol_adapter.ConnectionState.Disconnected,
            });
        }
    };
    MockProtocolAdapter.prototype.getApiCalls = function () {
        return this.apiCalls;
    };
    MockProtocolAdapter.prototype.getConnectionState = function () {
        return this.connectionState;
    };
    MockProtocolAdapter.prototype.completeSubscribe = function (topicFilter, err, retryable) {
        var event = {
            topicFilter: topicFilter
        };
        if (err !== undefined) {
            event.err = err;
        }
        if (retryable !== undefined) {
            event.retryable = retryable;
        }
        // TODO - rework tests to pass with deferred event emission
        this.emit(protocol_adapter.ProtocolClientAdapter.SUBSCRIBE_COMPLETION, event);
    };
    MockProtocolAdapter.prototype.completeUnsubscribe = function (topicFilter, err, retryable) {
        var event = {
            topicFilter: topicFilter
        };
        if (err !== undefined) {
            event.err = err;
        }
        if (retryable !== undefined) {
            event.retryable = retryable;
        }
        // TODO - rework tests to pass with deferred event emission
        this.emit(protocol_adapter.ProtocolClientAdapter.UNSUBSCRIBE_COMPLETION, event);
    };
    MockProtocolAdapter.prototype.completePublish = function (completionData, err) {
        var event = {
            completionData: completionData
        };
        if (err) {
            event.err = err;
        }
        this.emit(protocol_adapter.ProtocolClientAdapter.PUBLISH_COMPLETION, event);
    };
    MockProtocolAdapter.prototype.triggerIncomingPublish = function (topic, payload) {
        var event = {
            topic: topic,
            payload: payload
        };
        this.emit(protocol_adapter.ProtocolClientAdapter.INCOMING_PUBLISH, event);
    };
    MockProtocolAdapter.prototype.on = function (event, listener) {
        _super.prototype.on.call(this, event, listener);
        return this;
    };
    return MockProtocolAdapter;
}(event_1.BufferedEventEmitter));
exports.MockProtocolAdapter = MockProtocolAdapter;
;
function subscriptionManagerEventSequenceContainsEvent(eventSequence, expectedEvent) {
    var e_1, _a;
    try {
        for (var eventSequence_1 = __values(eventSequence), eventSequence_1_1 = eventSequence_1.next(); !eventSequence_1_1.done; eventSequence_1_1 = eventSequence_1.next()) {
            var event_2 = eventSequence_1_1.value;
            if (event_2.type !== expectedEvent.type) {
                continue;
            }
            if (expectedEvent.data.hasOwnProperty('operationId')) {
                if (!event_2.data.hasOwnProperty('operationId') || expectedEvent.data.operationId !== event_2.data.operationId) {
                    continue;
                }
            }
            if (expectedEvent.data.hasOwnProperty('topicFilter')) {
                if (!event_2.data.hasOwnProperty('topicFilter') || expectedEvent.data.topicFilter !== event_2.data.topicFilter) {
                    continue;
                }
            }
            return true;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (eventSequence_1_1 && !eventSequence_1_1.done && (_a = eventSequence_1.return)) _a.call(eventSequence_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return false;
}
exports.subscriptionManagerEventSequenceContainsEvent = subscriptionManagerEventSequenceContainsEvent;
function subscriptionManagerEventSequenceContainsEvents(eventSequence, expectedEvents) {
    var e_2, _a;
    try {
        for (var expectedEvents_1 = __values(expectedEvents), expectedEvents_1_1 = expectedEvents_1.next(); !expectedEvents_1_1.done; expectedEvents_1_1 = expectedEvents_1.next()) {
            var expectedEvent = expectedEvents_1_1.value;
            if (!subscriptionManagerEventSequenceContainsEvent(eventSequence, expectedEvent)) {
                return false;
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (expectedEvents_1_1 && !expectedEvents_1_1.done && (_a = expectedEvents_1.return)) _a.call(expectedEvents_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return true;
}
exports.subscriptionManagerEventSequenceContainsEvents = subscriptionManagerEventSequenceContainsEvents;
function protocolAdapterApiCallSequenceContainsApiCall(apiCallSequence, expectedApiCall) {
    var e_3, _a;
    try {
        for (var apiCallSequence_1 = __values(apiCallSequence), apiCallSequence_1_1 = apiCallSequence_1.next(); !apiCallSequence_1_1.done; apiCallSequence_1_1 = apiCallSequence_1.next()) {
            var apiCall = apiCallSequence_1_1.value;
            if (apiCall.methodName !== expectedApiCall.methodName) {
                continue;
            }
            if (expectedApiCall.args.hasOwnProperty('topicFilter')) {
                if (!apiCall.args.hasOwnProperty('topicFilter') || expectedApiCall.args.topicFilter !== apiCall.args.topicFilter) {
                    continue;
                }
            }
            return true;
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (apiCallSequence_1_1 && !apiCallSequence_1_1.done && (_a = apiCallSequence_1.return)) _a.call(apiCallSequence_1);
        }
        finally { if (e_3) throw e_3.error; }
    }
    return false;
}
exports.protocolAdapterApiCallSequenceContainsApiCall = protocolAdapterApiCallSequenceContainsApiCall;
function protocolAdapterApiCallSequenceContainsApiCalls(apiCallSequence, expectedApiCalls) {
    var e_4, _a;
    try {
        for (var expectedApiCalls_1 = __values(expectedApiCalls), expectedApiCalls_1_1 = expectedApiCalls_1.next(); !expectedApiCalls_1_1.done; expectedApiCalls_1_1 = expectedApiCalls_1.next()) {
            var expectedApiCall = expectedApiCalls_1_1.value;
            if (!protocolAdapterApiCallSequenceContainsApiCall(apiCallSequence, expectedApiCall)) {
                return false;
            }
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (expectedApiCalls_1_1 && !expectedApiCalls_1_1.done && (_a = expectedApiCalls_1.return)) _a.call(expectedApiCalls_1);
        }
        finally { if (e_4) throw e_4.error; }
    }
    return true;
}
exports.protocolAdapterApiCallSequenceContainsApiCalls = protocolAdapterApiCallSequenceContainsApiCalls;
//# sourceMappingURL=protocol_adapter_mock.js.map