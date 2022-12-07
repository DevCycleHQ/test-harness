import nock from 'nock'

const scope = nock('https://nock.com')
export const getServerScope = () => scope
