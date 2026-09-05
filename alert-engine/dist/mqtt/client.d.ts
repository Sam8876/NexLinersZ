export interface TelemetryMessageHandler {
    (topic: string, payload: Buffer): void;
}
export declare class MqttConnectionManager {
    private localClient;
    private awsClient;
    private isAws;
    connect(onMessage: TelemetryMessageHandler): Promise<void>;
    subscribe(topic: string): void;
    publish(topic: string, message: string): void;
    disconnect(): Promise<void>;
}
export declare const mqttManager: MqttConnectionManager;
