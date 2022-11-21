import { Sdks } from '../../types/sdks'
export const forEachSDK = (name, tests) => {
    // get the list of SDK's and their capabilities
    const SDKs = JSON.parse(process.env.SDKS_TO_TEST) || Object.values(Sdks)
    describe.each(SDKs)(name, tests)
}
