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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolClientAdapter = exports.ConnectionState = void 0;
/**
 *
 * @packageDocumentation
 * @module mqtt_request_response
 *
 */
var error_1 = require("../error");
var mqtt311 = __importStar(require("../mqtt"));
var mqtt5 = __importStar(require("../mqtt5"));
var event_1 = require("../../common/event");
var MS_PER_SECOND = 1000;
var ConnectionState;
(function (ConnectionState) {
    ConnectionState[ConnectionState["Connected"] = 0] = "Connected";
    ConnectionState[ConnectionState["Disconnected"] = 1] = "Disconnected";
})(ConnectionState = exports.ConnectionState || (exports.ConnectionState = {}));
/*
 * Provides a client-agnostic wrapper around the MQTT functionality needed by the browser request-response client.
 *
 * This is a direct port of aws-c-mqtt's aws_mqtt_protocol_adapter implementation.
 *
 * We use events and not promises for all of these operations because it's critical that the request-response
 * client never awaits on async promises directly.  All promise waits are done on scheduled tasks instead.
 */
var ProtocolClientAdapter = /** @class */ (function (_super) {
    __extends(ProtocolClientAdapter, _super);
    function ProtocolClientAdapter() {
        var _this = _super.call(this) || this;
        _this.connectionSuccessListener5 = function (event) {
            _this.connectionState = ConnectionState.Connected;
            setImmediate(function () {
                _this.emit(ProtocolClientAdapter.CONNECTION_STATUS, {
                    status: ConnectionState.Connected,
                    joinedSession: event.connack.sessionPresent,
                });
            });
        };
        _this.disconnectionListener5 = function (event) {
            _this.connectionState = ConnectionState.Disconnected;
            setImmediate(function () {
                _this.emit(ProtocolClientAdapter.CONNECTION_STATUS, {
                    status: ConnectionState.Disconnected,
                });
            });
        };
        _this.incomingPublishListener5 = function (event) {
            setImmediate(function () {
                _this.emit(ProtocolClientAdapter.INCOMING_PUBLISH, {
                    topic: event.message.topicName,
                    payload: event.message.payload
                });
            });
        };
        _this.connectionSuccessListener311 = function (event) {
            _this.connectionState = ConnectionState.Connected;
            setImmediate(function () {
                _this.emit(ProtocolClientAdapter.CONNECTION_STATUS, {
                    status: ConnectionState.Connected,
                    joinedSession: event.session_present,
                });
            });
        };
        _this.disconnectionListener311 = function () {
            _this.connectionState = ConnectionState.Disconnected;
            setImmediate(function () {
                _this.emit(ProtocolClientAdapter.CONNECTION_STATUS, {
                    status: ConnectionState.Disconnected,
                });
            });
        };
        _this.incomingPublishListener311 = function (topic, payload, dup, qos, retain) {
            setImmediate(function () {
                _this.emit(ProtocolClientAdapter.INCOMING_PUBLISH, {
                    topic: topic,
                    payload: payload
                });
            });
        };
        _this.connectionState = ConnectionState.Disconnected;
        _this.closed = false;
        return _this;
    }
    ProtocolClientAdapter.newFrom5 = function (client) {
        var adapter = new ProtocolClientAdapter();
        adapter.client5 = client;
        client.addListener(mqtt5.Mqtt5Client.CONNECTION_SUCCESS, adapter.connectionSuccessListener5);
        client.addListener(mqtt5.Mqtt5Client.DISCONNECTION, adapter.disconnectionListener5);
        client.addListener(mqtt5.Mqtt5Client.MESSAGE_RECEIVED, adapter.incomingPublishListener5);
        adapter.connectionState = client.isConnected() ? ConnectionState.Connected : ConnectionState.Disconnected;
        return adapter;
    };
    ProtocolClientAdapter.newFrom311 = function (client) {
        var adapter = new ProtocolClientAdapter();
        adapter.client311 = client;
        client.addListener(mqtt311.MqttClientConnection.CONNECTION_SUCCESS, adapter.connectionSuccessListener311);
        client.addListener(mqtt311.MqttClientConnection.DISCONNECT, adapter.disconnectionListener311);
        client.addListener(mqtt311.MqttClientConnection.MESSAGE, adapter.incomingPublishListener311);
        adapter.connectionState = client.is_connected() ? ConnectionState.Connected : ConnectionState.Disconnected;
        return adapter;
    };
    ProtocolClientAdapter.prototype.close = function () {
        if (this.closed) {
            return;
        }
        this.closed = true;
        if (this.client5) {
            this.client5.removeListener(mqtt5.Mqtt5Client.CONNECTION_SUCCESS, this.connectionSuccessListener5);
            this.client5.removeListener(mqtt5.Mqtt5Client.DISCONNECTION, this.disconnectionListener5);
            this.client5.removeListener(mqtt5.Mqtt5Client.MESSAGE_RECEIVED, this.incomingPublishListener5);
            this.client5 = undefined;
        }
        if (this.client311) {
            this.client311.removeListener(mqtt311.MqttClientConnection.CONNECTION_SUCCESS, this.connectionSuccessListener311);
            this.client311.removeListener(mqtt311.MqttClientConnection.DISCONNECT, this.disconnectionListener311);
            this.client311.removeListener(mqtt311.MqttClientConnection.MESSAGE, this.incomingPublishListener311);
            this.client311 = undefined;
        }
    };
    ProtocolClientAdapter.prototype.publish = function (publishOptions) {
        var _this = this;
        if (this.closed) {
            throw new error_1.CrtError(ProtocolClientAdapter.ADAPTER_CLOSED);
        }
        var publishResult = undefined;
        setImmediate(function () { return __awaiter(_this, void 0, void 0, function () {
            var publishPromise, packet, timeoutPromise;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.client5) {
                            packet = {
                                topicName: publishOptions.topic,
                                qos: mqtt5.QoS.AtLeastOnce,
                                payload: publishOptions.payload,
                            };
                            publishPromise = this.client5.publish(packet).then(function (result) {
                                if (!publishResult) {
                                    publishResult = {
                                        completionData: publishOptions.completionData
                                    };
                                    if (result && !mqtt5.isSuccessfulPubackReasonCode(result.reasonCode)) {
                                        publishResult.err = new error_1.CrtError(ProtocolClientAdapter.FAILING_PUBACK_REASON_CODE);
                                    }
                                }
                            }, function (err) {
                                if (!publishResult) {
                                    publishResult = {
                                        completionData: publishOptions.completionData,
                                        err: err
                                    };
                                }
                            });
                        }
                        else if (this.client311) {
                            publishPromise = this.client311.publish(publishOptions.topic, publishOptions.payload, mqtt311.QoS.AtLeastOnce).then(function (response) {
                                if (!publishResult) {
                                    publishResult = {
                                        completionData: publishOptions.completionData
                                    };
                                }
                            }, function (err) {
                                if (!publishResult) {
                                    publishResult = {
                                        completionData: publishOptions.completionData,
                                        err: err
                                    };
                                }
                            });
                        }
                        else {
                            throw new error_1.CrtError(ProtocolClientAdapter.ILLEGAL_ADAPTER_STATE);
                        }
                        timeoutPromise = new Promise(function (resolve) { return setTimeout(function () {
                            if (!publishResult) {
                                publishResult = {
                                    completionData: publishOptions.completionData,
                                    err: new error_1.CrtError(ProtocolClientAdapter.OPERATION_TIMEOUT)
                                };
                            }
                        }, publishOptions.timeoutInSeconds * MS_PER_SECOND); });
                        return [4 /*yield*/, Promise.race([publishPromise, timeoutPromise])];
                    case 1:
                        _a.sent();
                        this.emit(ProtocolClientAdapter.PUBLISH_COMPLETION, publishResult);
                        return [2 /*return*/];
                }
            });
        }); });
    };
    ProtocolClientAdapter.prototype.subscribe = function (subscribeOptions) {
        var _this = this;
        if (this.closed) {
            throw new error_1.CrtError(ProtocolClientAdapter.ADAPTER_CLOSED);
        }
        var subscribeResult = undefined;
        setImmediate(function () { return __awaiter(_this, void 0, void 0, function () {
            var subscribePromise, packet, timeoutPromise;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.client5) {
                            packet = {
                                subscriptions: [
                                    {
                                        topicFilter: subscribeOptions.topicFilter,
                                        qos: mqtt5.QoS.AtLeastOnce,
                                    }
                                ]
                            };
                            subscribePromise = this.client5.subscribe(packet).then(function (suback) {
                                if (!subscribeResult) {
                                    subscribeResult = {
                                        topicFilter: subscribeOptions.topicFilter,
                                    };
                                    var reasonCode = suback.reasonCodes[0];
                                    if (!mqtt5.isSuccessfulSubackReasonCode(reasonCode)) {
                                        subscribeResult.err = new error_1.CrtError(ProtocolClientAdapter.FAILING_SUBACK_REASON_CODE);
                                        subscribeResult.retryable = ProtocolClientAdapter.isSubackReasonCodeRetryable(reasonCode);
                                    }
                                }
                            }, function (err) {
                                if (!subscribeResult) {
                                    subscribeResult = {
                                        topicFilter: subscribeOptions.topicFilter,
                                        err: err,
                                        retryable: false
                                    };
                                }
                            });
                        }
                        else if (this.client311) {
                            subscribePromise = this.client311.subscribe(subscribeOptions.topicFilter, mqtt311.QoS.AtLeastOnce).then(function (response) {
                                if (!subscribeResult) {
                                    subscribeResult = {
                                        topicFilter: subscribeOptions.topicFilter
                                    };
                                    if (response.qos >= 128) {
                                        subscribeResult.err = new error_1.CrtError(ProtocolClientAdapter.FAILING_SUBACK_REASON_CODE);
                                        subscribeResult.retryable = true;
                                    }
                                    else if (response.error_code) {
                                        subscribeResult.err = new error_1.CrtError("Internal Error");
                                        subscribeResult.retryable = true;
                                    }
                                }
                            }, function (err) {
                                if (!subscribeResult) {
                                    subscribeResult = {
                                        topicFilter: subscribeOptions.topicFilter,
                                        err: err,
                                        retryable: false,
                                    };
                                }
                            });
                        }
                        else {
                            throw new error_1.CrtError(ProtocolClientAdapter.ILLEGAL_ADAPTER_STATE);
                        }
                        timeoutPromise = new Promise(function (resolve) { return setTimeout(function () {
                            if (!subscribeResult) {
                                subscribeResult = {
                                    topicFilter: subscribeOptions.topicFilter,
                                    err: new error_1.CrtError(ProtocolClientAdapter.OPERATION_TIMEOUT),
                                    retryable: true,
                                };
                            }
                        }, subscribeOptions.timeoutInSeconds * MS_PER_SECOND); });
                        return [4 /*yield*/, Promise.race([subscribePromise, timeoutPromise])];
                    case 1:
                        _a.sent();
                        this.emit(ProtocolClientAdapter.SUBSCRIBE_COMPLETION, subscribeResult);
                        return [2 /*return*/];
                }
            });
        }); });
    };
    ProtocolClientAdapter.prototype.unsubscribe = function (unsubscribeOptions) {
        var _this = this;
        if (this.closed) {
            throw new error_1.CrtError(ProtocolClientAdapter.ADAPTER_CLOSED);
        }
        var unsubscribeResult = undefined;
        setImmediate(function () { return __awaiter(_this, void 0, void 0, function () {
            var unsubscribePromise, packet, timeoutPromise;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.client5) {
                            packet = {
                                topicFilters: [unsubscribeOptions.topicFilter]
                            };
                            unsubscribePromise = this.client5.unsubscribe(packet).then(function (unsuback) {
                                if (!unsubscribeResult) {
                                    unsubscribeResult = {
                                        topicFilter: unsubscribeOptions.topicFilter
                                    };
                                    var reasonCode = unsuback.reasonCodes[0];
                                    if (!mqtt5.isSuccessfulUnsubackReasonCode(unsuback.reasonCodes[0])) {
                                        unsubscribeResult.err = new error_1.CrtError(ProtocolClientAdapter.FAILING_UNSUBACK_REASON_CODE);
                                        unsubscribeResult.retryable = ProtocolClientAdapter.isUnsubackReasonCodeRetryable(reasonCode);
                                    }
                                }
                            }, function (err) {
                                if (!unsubscribeResult) {
                                    unsubscribeResult = {
                                        topicFilter: unsubscribeOptions.topicFilter,
                                        err: err,
                                        retryable: false,
                                    };
                                }
                            });
                        }
                        else if (this.client311) {
                            unsubscribePromise = this.client311.unsubscribe(unsubscribeOptions.topicFilter).then(function (_) {
                                if (!unsubscribeResult) {
                                    unsubscribeResult = {
                                        topicFilter: unsubscribeOptions.topicFilter
                                    };
                                }
                            }, function (err) {
                                if (!unsubscribeResult) {
                                    unsubscribeResult = {
                                        topicFilter: unsubscribeOptions.topicFilter,
                                        err: err,
                                        retryable: false,
                                    };
                                }
                            });
                        }
                        else {
                            throw new error_1.CrtError(ProtocolClientAdapter.ILLEGAL_ADAPTER_STATE);
                        }
                        timeoutPromise = new Promise(function (resolve) { return setTimeout(function () {
                            if (!unsubscribeResult) {
                                unsubscribeResult = {
                                    topicFilter: unsubscribeOptions.topicFilter,
                                    err: new error_1.CrtError(ProtocolClientAdapter.OPERATION_TIMEOUT),
                                    retryable: true,
                                };
                            }
                        }, unsubscribeOptions.timeoutInSeconds * MS_PER_SECOND); });
                        return [4 /*yield*/, Promise.race([unsubscribePromise, timeoutPromise])];
                    case 1:
                        _a.sent();
                        this.emit(ProtocolClientAdapter.UNSUBSCRIBE_COMPLETION, unsubscribeResult);
                        return [2 /*return*/];
                }
            });
        }); });
    };
    ProtocolClientAdapter.prototype.getConnectionState = function () {
        if (this.closed) {
            throw new error_1.CrtError(ProtocolClientAdapter.ADAPTER_CLOSED);
        }
        return this.connectionState;
    };
    ProtocolClientAdapter.prototype.on = function (event, listener) {
        _super.prototype.on.call(this, event, listener);
        return this;
    };
    ProtocolClientAdapter.isUnsubackReasonCodeRetryable = function (reasonCode) {
        switch (reasonCode) {
            case mqtt5.UnsubackReasonCode.ImplementationSpecificError:
            case mqtt5.UnsubackReasonCode.PacketIdentifierInUse:
                return true;
            default:
                return false;
        }
    };
    ProtocolClientAdapter.isSubackReasonCodeRetryable = function (reasonCode) {
        switch (reasonCode) {
            case mqtt5.SubackReasonCode.PacketIdentifierInUse:
            case mqtt5.SubackReasonCode.ImplementationSpecificError:
            case mqtt5.SubackReasonCode.QuotaExceeded:
                return true;
            default:
                return false;
        }
    };
    ProtocolClientAdapter.PUBLISH_COMPLETION = 'publishCompletion';
    ProtocolClientAdapter.SUBSCRIBE_COMPLETION = 'subscribeCompletion';
    ProtocolClientAdapter.UNSUBSCRIBE_COMPLETION = 'unsubscribeCompletion';
    ProtocolClientAdapter.CONNECTION_STATUS = 'connectionStatus';
    ProtocolClientAdapter.INCOMING_PUBLISH = 'incomingPublish';
    ProtocolClientAdapter.FAILING_PUBACK_REASON_CODE = "Failing Puback Reason Code";
    ProtocolClientAdapter.FAILING_SUBACK_REASON_CODE = "Failing Suback Reason Code";
    ProtocolClientAdapter.FAILING_UNSUBACK_REASON_CODE = "Failing Unsuback Reason Code";
    ProtocolClientAdapter.ILLEGAL_ADAPTER_STATE = "Illegal Adapter State";
    ProtocolClientAdapter.OPERATION_TIMEOUT = "Operation Timeout";
    ProtocolClientAdapter.ADAPTER_CLOSED = "Protocol Client Adapter Closed";
    return ProtocolClientAdapter;
}(event_1.BufferedEventEmitter));
exports.ProtocolClientAdapter = ProtocolClientAdapter;
//# sourceMappingURL=protocol_adapter.js.map