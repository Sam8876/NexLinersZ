"use strict";
/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0.
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestResponseClient = exports.StreamingOperationBase = void 0;
/**
 *
 * @packageDocumentation
 * @module mqtt_request_response
 * @mergeTarget
 *
 */
const error_1 = require("./error");
const mqtt_request_response_internal = __importStar(require("../common/mqtt_request_response_internal"));
const native_resource_1 = require("./native_resource");
const event_1 = require("../common/event");
const binding_1 = __importDefault(require("./binding"));
const io_1 = require("./io");
__exportStar(require("../common/mqtt_request_response"), exports);
/**
 * An AWS MQTT service streaming operation.  A streaming operation listens to messages on
 * a particular topic, deserializes them using a service model, and emits the modeled data as Javascript events.
 */
class StreamingOperationBase extends (0, native_resource_1.NativeResourceMixin)(event_1.BufferedEventEmitter) {
    static new(options, client) {
        if (!options) {
            throw new error_1.CrtError("invalid configuration for streaming operation");
        }
        let operation = new StreamingOperationBase(client);
        operation._super(binding_1.default.mqtt_streaming_operation_new(operation, client.native_handle(), options, (streamingOperation, type, error_code) => {
            StreamingOperationBase._s_on_subscription_status_update(operation, type, error_code);
        }, (streamingOperation, publishEvent) => {
            StreamingOperationBase._s_on_incoming_publish(operation, publishEvent);
        }));
        client.registerUnclosedStreamingOperation(operation);
        return operation;
    }
    constructor(client) {
        super();
        this.state = mqtt_request_response_internal.StreamingOperationState.None;
        this.client = client;
    }
    /**
     * Triggers the streaming operation to start listening to the configured stream of events.  Has no effect on an
     * already-open operation.  It is an error to attempt to re-open a closed streaming operation.
     */
    open() {
        if (this.state == mqtt_request_response_internal.StreamingOperationState.None) {
            this.state = mqtt_request_response_internal.StreamingOperationState.Open;
            binding_1.default.mqtt_streaming_operation_open(this.native_handle());
        }
        else if (this.state == mqtt_request_response_internal.StreamingOperationState.Closed) {
            throw new error_1.CrtError("MQTT streaming operation already closed");
        }
    }
    /**
     * Stops a streaming operation from listening to the configured stream of events and releases all native
     * resources associated with the stream.
     */
    close() {
        if (this.state != mqtt_request_response_internal.StreamingOperationState.Closed) {
            this.client.unregisterUnclosedStreamingOperation(this);
            this.state = mqtt_request_response_internal.StreamingOperationState.Closed;
            binding_1.default.mqtt_streaming_operation_close(this.native_handle());
        }
    }
    on(event, listener) {
        super.on(event, listener);
        return this;
    }
    static _s_on_subscription_status_update(streamingOperation, type, error_code) {
        let statusEvent = {
            type: type
        };
        if (error_code != 0) {
            statusEvent.error = new error_1.CrtError(error_code);
        }
        process.nextTick(() => {
            streamingOperation.emit(StreamingOperationBase.SUBSCRIPTION_STATUS, statusEvent);
        });
    }
    static _s_on_incoming_publish(streamingOperation, publishEvent) {
        process.nextTick(() => {
            streamingOperation.emit(StreamingOperationBase.INCOMING_PUBLISH, publishEvent);
        });
    }
}
exports.StreamingOperationBase = StreamingOperationBase;
/**
 * Event emitted when the stream's subscription status changes.
 *
 * Listener type: {@link SubscriptionStatusListener}
 *
 * @event
 */
StreamingOperationBase.SUBSCRIPTION_STATUS = 'subscriptionStatus';
/**
 * Event emitted when a stream message is received
 *
 * Listener type: {@link IncomingPublishListener}
 *
 * @event
 */
StreamingOperationBase.INCOMING_PUBLISH = 'incomingPublish';
/**
 * Native implementation of an MQTT-based request-response client tuned for AWS MQTT services.
 *
 * Supports streaming operations (listen to a stream of modeled events from an MQTT topic) and request-response
 * operations (performs the subscribes, publish, and incoming publish correlation and error checking needed to
 * perform simple request-response operations over MQTT).
 */
class RequestResponseClient extends (0, native_resource_1.NativeResourceMixin)(event_1.BufferedEventEmitter) {
    constructor() {
        super();
        this.state = mqtt_request_response_internal.RequestResponseClientState.Ready;
        this.unclosedOperations = new Set();
    }
    /**
     * Creates a new MQTT service request-response client that uses an MQTT5 client as the protocol implementation.
     *
     * @param protocolClient protocol client to use for all operations
     * @param options configuration options for the desired request-response client
     */
    static newFromMqtt5(protocolClient, options) {
        if (!protocolClient) {
            throw new error_1.CrtError("protocol client is null");
        }
        let client = new RequestResponseClient();
        client._super(binding_1.default.mqtt_request_response_client_new_from_5(client, protocolClient.native_handle(), options));
        return client;
    }
    /**
     * Creates a new MQTT service request-response client that uses an MQTT311 client as the protocol implementation.
     *
     * @param protocolClient protocol client to use for all operations
     * @param options configuration options for the desired request-response client
     */
    static newFromMqtt311(protocolClient, options) {
        if (!protocolClient) {
            throw new error_1.CrtError("protocol client is null");
        }
        let client = new RequestResponseClient();
        client._super(binding_1.default.mqtt_request_response_client_new_from_311(client, protocolClient.native_handle(), options));
        return client;
    }
    /**
     * Triggers cleanup of native resources associated with the request-response client.  Closing a client will fail
     * all incomplete requests and close all outstanding streaming operations.
     *
     * This must be called when finished with a client; otherwise, native resources will leak.
     */
    close() {
        if (this.state != mqtt_request_response_internal.RequestResponseClientState.Closed) {
            this.state = mqtt_request_response_internal.RequestResponseClientState.Closed;
            this.closeStreamingOperations();
            binding_1.default.mqtt_request_response_client_close(this.native_handle());
        }
    }
    /**
     * Creates a new streaming operation from a set of configuration options.  A streaming operation provides a
     * mechanism for listening to a specific event stream from an AWS MQTT-based service.
     *
     * @param streamOptions configuration options for the streaming operation
     */
    createStream(streamOptions) {
        if (this.state == mqtt_request_response_internal.RequestResponseClientState.Closed) {
            throw new error_1.CrtError("MQTT request-response client has already been closed");
        }
        return StreamingOperationBase.new(streamOptions, this);
    }
    /**
     * Submits a request to the request-response client.
     *
     * @param requestOptions description of the request to perform
     *
     * Returns a promise that resolves to a response to the request or an error describing how the request attempt
     * failed.
     *
     * A "successful" request-response execution flow is defined as "the service sent a response payload that
     * correlates with the request payload."  Upon deserialization (which is the responsibility of the service model
     * client, one layer up), such a payload may actually indicate a failure.
     */
    submitRequest(requestOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (this.state == mqtt_request_response_internal.RequestResponseClientState.Closed) {
                    reject(new error_1.CrtError("MQTT request-response client has already been closed"));
                    return;
                }
                if (!requestOptions) {
                    reject(new error_1.CrtError("null request options"));
                    return;
                }
                function curriedPromiseCallback(errorCode, topic, response) {
                    return RequestResponseClient._s_on_request_completion(resolve, reject, errorCode, topic, response);
                }
                try {
                    binding_1.default.mqtt_request_response_client_submit_request(this.native_handle(), requestOptions, curriedPromiseCallback);
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    }
    /**
     *
     * Adds a streaming operation to the set of operations that will be closed automatically when the
     * client is closed.
     *
     * @internal
     *
     * @param operation streaming operation to add
     */
    registerUnclosedStreamingOperation(operation) {
        if (this.unclosedOperations) {
            this.unclosedOperations.add(operation);
        }
    }
    /**
     *
     * Removes a streaming operation from the set of operations that will be closed automatically when the
     * client is closed.
     *
     * @internal
     *
     * @param operation streaming operation to remove
     */
    unregisterUnclosedStreamingOperation(operation) {
        if (this.unclosedOperations) {
            this.unclosedOperations.delete(operation);
        }
    }
    closeStreamingOperations() {
        if (this.unclosedOperations) {
            // swap out the set so that calls to unregisterUnclosedStreamingOperation do not mess with things mid-iteration
            let unclosedOperations = this.unclosedOperations;
            this.unclosedOperations = undefined;
            for (const operation of unclosedOperations) {
                operation.close();
            }
        }
    }
    static _s_on_request_completion(resolve, reject, errorCode, topic, payload) {
        if (errorCode == 0 && topic !== undefined && payload !== undefined) {
            let response = {
                payload: payload,
                topic: topic,
            };
            resolve(response);
        }
        else {
            reject(new error_1.CrtError((0, io_1.error_code_to_string)(errorCode)));
        }
    }
}
exports.RequestResponseClient = RequestResponseClient;
//# sourceMappingURL=mqtt_request_response.js.map