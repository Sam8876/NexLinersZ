import * as protocol_adapter from "./protocol_adapter";
import { BufferedEventEmitter } from "../../common/event";
import { ICrtError } from "../../common/error";
import * as subscription_manager from "./subscription_manager";
import { IncomingPublishEventListener } from "./protocol_adapter";
export interface ProtocolAdapterApiCall {
    methodName: string;
    args: any;
}
export interface MockProtocolAdapterOptions {
    subscribeHandler?: (adapter: MockProtocolAdapter, subscribeOptions: protocol_adapter.SubscribeOptions, context?: any) => void;
    subscribeHandlerContext?: any;
    unsubscribeHandler?: (adapter: MockProtocolAdapter, unsubscribeOptions: protocol_adapter.UnsubscribeOptions, context?: any) => void;
    unsubscribeHandlerContext?: any;
    publishHandler?: (adapter: MockProtocolAdapter, publishOptions: protocol_adapter.PublishOptions, context?: any) => void;
    publishHandlerContext?: any;
}
export declare class MockProtocolAdapter extends BufferedEventEmitter {
    private options?;
    private apiCalls;
    private connectionState;
    constructor(options?: MockProtocolAdapterOptions | undefined);
    close(): void;
    publish(publishOptions: protocol_adapter.PublishOptions): void;
    subscribe(subscribeOptions: protocol_adapter.SubscribeOptions): void;
    unsubscribe(unsubscribeOptions: protocol_adapter.UnsubscribeOptions): void;
    connect(joinedSession?: boolean): void;
    disconnect(): void;
    getApiCalls(): Array<ProtocolAdapterApiCall>;
    getConnectionState(): protocol_adapter.ConnectionState;
    completeSubscribe(topicFilter: string, err?: ICrtError, retryable?: boolean): void;
    completeUnsubscribe(topicFilter: string, err?: ICrtError, retryable?: boolean): void;
    completePublish(completionData: any, err?: ICrtError): void;
    triggerIncomingPublish(topic: string, payload: ArrayBuffer): void;
    on(event: 'publishCompletion', listener: protocol_adapter.PublishCompletionEventListener): this;
    on(event: 'subscribeCompletion', listener: protocol_adapter.SubscribeCompletionEventListener): this;
    on(event: 'unsubscribeCompletion', listener: protocol_adapter.UnsubscribeCompletionEventListener): this;
    on(event: 'connectionStatus', listener: protocol_adapter.ConnectionStatusEventListener): this;
    on(event: 'incomingPublish', listener: IncomingPublishEventListener): this;
}
export interface SubscriptionManagerEvent {
    type: subscription_manager.SubscriptionEventType;
    data: any;
}
export declare function subscriptionManagerEventSequenceContainsEvent(eventSequence: SubscriptionManagerEvent[], expectedEvent: SubscriptionManagerEvent): boolean;
export declare function subscriptionManagerEventSequenceContainsEvents(eventSequence: SubscriptionManagerEvent[], expectedEvents: SubscriptionManagerEvent[]): boolean;
export declare function protocolAdapterApiCallSequenceContainsApiCall(apiCallSequence: ProtocolAdapterApiCall[], expectedApiCall: ProtocolAdapterApiCall): boolean;
export declare function protocolAdapterApiCallSequenceContainsApiCalls(apiCallSequence: ProtocolAdapterApiCall[], expectedApiCalls: ProtocolAdapterApiCall[]): boolean;
