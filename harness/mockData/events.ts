export const optionalUserEventFields = {
    appVersion: expect.toBeNil(),
    // TODO remove 0 when this is fixed https://taplytics.atlassian.net/browse/DVC-6295
    appBuild: expect.toBeOneOf([undefined, null, 0]),
    customData: expect.toBeNil(),
    privateCustomData: expect.toBeNil(),
    language: expect.toBeNil(),
    country: expect.toBeNil(),
    email: expect.toBeNil(),
    deviceModel: expect.toBeNil(),
    name: expect.toBeNil(),
    createdDate: expect.any(String),
    lastSeenDate: expect.any(String),
    platformVersion: expect.any(String),
    sdkVersion: expect.any(String),
    // TODO expect this to always be a string when these are fixed: DVC-6303, DVC-6304, DVC-6305
    hostname: expect.toBeOneOf([null, undefined, expect.any(String)]),
}

export const optionalEventFields = {
    clientDate: expect.any(String),
    // TODO expect this to be empty when these are fixed: DVC-6300, DVC-6301
    date: expect.toBeOneOf([null, undefined, expect.any(String)]),
}
