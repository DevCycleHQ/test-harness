
export const SSEMessageExample = "{\"id\":\"yATzPE/mOzgY:0\",\"timestamp\":1712853334259,\"channel\":\"dvc_server_4fedfbd7a1aef0848768c8fad8f4536ca57e0ba0_v1\",\"data\":\"{\\\"etag\\\":\\\"\\\\\\\"714bc6a9acb038971923289ee6ce665b\\\\\\\"\\\",\\\"lastModified\\\":1712853333000}\",\"name\":\"change\"}"

export class SSEMessageData {
    etag: string
    lastModified: number
}
export class SSEMessage {
    id: string
    timestamp: number
    channel: string
    data: string
    name: string
}