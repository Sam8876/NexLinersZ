/**
 *
 * @packageDocumentation
 * @module mqtt_request_response
 * @mergeTarget
 *
 */
import * as protocol_client_adapter from "./mqtt_request_response/protocol_adapter";
import { MqttClientConnection } from "./mqtt";
import { Mqtt5Client } from "./mqtt5";
import * as mqtt_request_response from "../common/mqtt_request_response";
import { BufferedEventEmitter } from "../common/event";
export * from "../common/mqtt_request_response";
interface StreamingOperationInternalOptions {
    close: () => void;
    open: () => void;
}
/**
 * An AWS MQTT service streaming operation.  A streaming operation listens to messages on
 * a particular topic, deserializes them using a service model, and emits the modeled data as Javascript events.
 */
export declare class StreamingOperationBase extends BufferedEventEmitter implements mqtt_request_response.IStreamingOperation {
    private internalOptions;
    private state;
    constructor(options: StreamingOperationInternalOptions);
    /**
     * Triggers the streaming operation to start listening to the configured stream of events.  Has no effect on an
     * already-open operation.  It is an error to attempt to re-open a closed streaming operation.
     */
    open(): void;
    /**
     * Stops a streaming operation from listening to the configured stream of events
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
}
/**
 * Native implementation of an MQTT-based request-response client tuned for AWS MQTT services.
 *
 * Supports streaming operations (listen to a stream of modeled events from an MQTT topic) and request-response
 * operations (performs the subscribes, publish, and incoming publish correlation and error checking needed to
 * perform simple request-response operations over MQTT).
 */
export declare class RequestResponseClient extends BufferedEventEmitter implements mqtt_request_response.IRequestResponseClient {
    private static logSubject;
    private readonly operationTimeoutInSeconds;
    private nextOperationId;
    private protocolClientAdapter;
    private subscriptionManager;
    private state;
    private serviceTask?;
    private operations;
    private streamingOperationsByTopicFilter;
    private correlationTokenPathsByResponsePaths;
    private operationsByCorrelationToken;
    private operationQueue;
    constructor(protocolClientAdapter: protocol_client_adapter.ProtocolClientAdapter, options: mqtt_request_response.RequestResponseClientOptions);
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
     * Creates a new streaming operation from a set of configuration options.  A streaming operation provides a
     * mechanism for listening to a specific event stream from an AWS MQTT-based service.
     *
     * @param streamOptions configuration options for the streaming operation
     *
     * browser/node implementers are covariant by returning an implementation of IStreamingOperation.  This split
     * is necessary because event listening (which streaming operations need) cannot be modeled on an interface.
     */
    createStream(streamOptions: mqtt_request_response.StreamingOperationOptions): StreamingOperationBase;
    private canOperationDequeue;
    private static buildSuscriptionListFromOperation;
    private addOperationToInProgressTables;
    private handleAcquireSubscriptionResult;
    private service;
    private clearServiceTask;
    private tryScheduleServiceTask;
    private wakeServiceTask;
    private closeAllOperations;
    private removeStreamingOperationFromTopicFilterSet;
    private decRefResponsePaths;
    private removeRequestResponseOperation;
    private removeStreamingOperation;
    private removeOperation;
    private completeRequestResponseOperationWithError;
    private haltStreamingOperationWithError;
    private completeOperationWithError;
    private completeRequestResponseOperationWithResponse;
    private handlePublishCompletionEvent;
    private handleConnectionStatusEvent;
    private handleIncomingPublishEventStreaming;
    private handleIncomingPublishEventRequestResponse;
    private handleIncomingPublishEvent;
    private handleSubscribeSuccessEvent;
    private handleSubscribeFailureEvent;
    private handleSubscriptionEndedEvent;
    private handleStreamingSubscriptionEstablishedEvent;
    private handleStreamingSubscriptionLostEvent;
    private handleStreamingSubscriptionHaltedEvent;
    private handleSubscriptionOrphanedEvent;
    private handleUnsubscribeCompleteEvent;
    private changeOperationState;
    private applyRequestResponsePublish;
    private openStreamingOperation;
    private closeStreamingOperation;
}
