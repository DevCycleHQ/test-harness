import Koa from 'koa'
import { DVCUser } from '@devcycle/nodejs-server-sdk'
import { EntityTypes } from '../entityTypes'
import { dataStore } from '../app'

export const handleUser = (ctx: Koa.ParameterizedContext) => {
    try {
        const user = new DVCUser(ctx.request.body as any)
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
    } catch (e) {
        ctx.status = 200
        ctx.body = {
            exception: e.message
        }
    }
}
