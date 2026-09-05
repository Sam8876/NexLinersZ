import { MqttClientConnection } from "./mqtt";
import { Mqtt5Client } from "./mqtt5";
import * as mqtt_request_response from "../common/mqtt_request_response";
import { BufferedEventEmitter } from "../common/event";
export * from "../common/mqtt_request_response";
declare const StreamingOperationBase_base: {
    new (...args: any[]): {
        _handle: any;
        _super(handle: any): void;
        native_handle(): any;
    };
} & typeof BufferedEventEmitter;
/**
 * An AWS MQTT service streaming operation.  A streaming operation listens to messages on
 * a particular topic, deserializes them using a service model, and emits the modeled data as Javascript events.
 */
export declare class StreamingOperationBase extends StreamingOperationBase_base implements mqtt_request_response.IStreamingOperation {
    private client;
    private state;
    static new(options: mqtt_request_response.StreamingOperationOptions, client: RequestResponseClient): StreamingOperationBase;
    private constructor();
    /**
     * Triggers the streaming operation to start listening to the configured stream of events.  Has no effect on an
     * already-open operation.  It is an error to attempt to re-open a closed streaming operation.
     */
    open(): void;
    /**
     * Stops a streaming operation from listening to the configured stream of events and releases all native
     * resources associated with the stream.
     */
    close(): void;
    /**
     * Event emitted when the stream's subscription status changes.
     *
     * Listener type: {@link SubscriptionStatusListener}
     *
     * @event
     */
    static SUBSCRIPTION_STATUS: string;
    /**
     * Event emitted when a stream message is received
     *
     * Listener type: {@link IncomingPublishListener}
     *
     * @event
     */
    static INCOMING_PUBLISH: string;
    on(event: 'subscriptionStatus', listener: mqtt_request_response.SubscriptionStatusListener): this;
    on(event: 'incomingPublish', listener: mqtt_request_response.IncomingPublishListener): this;
    private static _s_on_subscription_status_update;
    private static _s_on_incoming_publish;
}
declare const RequestResponseClient_base: {
    new (...args: any[]): {
        _handle: any;
        _super(handle: any): void;
        native_handle(): any;
    };
} & typeof BufferedEventEmitter;
/**
 * Native implementation of an MQTT-based request-response client tuned for AWS MQTT services.
 *
 * Supports streaming operations (listen to a stream of modeled events from an MQTT topic) and request-response
 * operations (performs the subscribes, publish, and incoming publish correlation and error checking needed to
 * perform simple request-response operations over MQTT).
 */
export declare class RequestResponseClient extends RequestResponseClient_base implements mqtt_request_response.IRequestResponseClient {
    private state;
    private unclosedOperations?;
    private constructor();
    /**
     * Creates a new MQTT service request-response client that uses an MQTT5 client as the protocol implementation.
     *
     * @param protocolClient protocol client to use for all operations
     * @param options configuration options for the desired request-response client
     */
    static newFromMqtt5(protocolClient: Mqtt5Client, options: mqtt_request_response.RequestResponseClientOptions): RequestResponseClient;
    /**
     * Creates a new MQTT service request-response client that uses an MQTT311 client as the protocol implementation.
     *
     * @param protocolClient protocol client to use for all operations
     * @param options configuration options for the desired request-response client
     */
    static newFromMqtt311(protocolClient: MqttClientConnection, options: mqtt_request_response.RequestResponseClientOptions): RequestResponseClient;
    /**
     * Triggers cleanup of native resources associated with the request-response client.  Closing a client will fail
     * all incomplete requests and close all outstanding streaming operations.
     *
     * This must be called when finished with a client; otherwise, native resources will leak.
     */
    close(): void;
    /**
     * Creates a new streaming operation from a set of configuration options.  A streaming operation provides a
     * mechanism for listening to a specific event stream from an AWS MQTT-based service.
     *
     * @param streamOptions configuration options for the streaming operation
     */
    createStream(streamOptions: mqtt_request_response.StreamingOperationOptions): StreamingOperationBase;
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
    submitRequest(requestOptions: mqtt_request_response.RequestResponseOperationOptions): Promise<mqtt_request_response.Response>;
    /**
     *
     * Adds a streaming operation to the set of operations that will be closed automatically when the
     * client is closed.
     *
     * @internal
     *
     * @param operation streaming operation to add
     */
    registerUnclosedStreamingOperation(operation: StreamingOperationBase): void;
    /**
     *
     * Removes a streaming operation from the set of operations that will be closed automatically when the
     * client is closed.
     *
     * @internal
     *
     * @param operation streaming operation to remove
     */
    unregisterUnclosedStreamingOperation(operation: StreamingOperationBase): void;
    private closeStreamingOperations;
    private static _s_on_request_completion;
}
