import Koa from 'koa'
import { DVCUser } from '@devcycle/nodejs-server-sdk'
import { EntityTypes } from '../entityTypes'
import { dataStore } from '../app'

export const handleUser = (ctx: Koa.ParameterizedContext) => {
    const user = <DVCUser>ctx.request.body

    const userId = Object.keys(dataStore.users).length
    dataStore.users[userId] = user

    ctx.status = 201
    ctx.set('Location', `user/${userId}`)
    ctx.body = {
        entityType: EntityTypes.user,
        data: {
            ...user
        }
    }
}
