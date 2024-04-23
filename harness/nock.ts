import nock, { Interceptor, Scope } from 'nock'

const scope = nock('https://myfakenockurl')

type ScopeArgs = Parameters<nock.Scope['post']>

let interceptors: nock.Interceptor[] = []

/**
 * implement a proxy wrapper for nock scope
 */
const scopeProxy = new Proxy(scope, {
    get: function (target, prop: keyof Scope, receiver) {
        const result = Reflect.get(target, prop, receiver)
        if (
            prop === 'get' ||
            prop === 'post' ||
            prop === 'put' ||
            prop === 'head' ||
            prop === 'patch'
        ) {
            const original = result as Scope['get']
            return (...args: ScopeArgs) => {
                const interceptor = original.call(target, ...args)
                interceptors.push(interceptor)
                return interceptor
            }
        } else {
            return result
        }
    },
})
export const getServerScope = (): Scope => scopeProxy

export const resetServerScope = () => {
    for (let i of interceptors) {
        nock.removeInterceptor(i)
    }
    interceptors = []
}
