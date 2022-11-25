import Koa from 'koa'
import { DVCUser } from '@devcycle/nodejs-server-sdk'
import { EntityTypes } from '../entityTypes'

export const handleUser = async (ctx: Koa.ParameterizedContext, users: { [key: string]: DVCUser }) => {
    const user = <DVCUser>ctx.request.body

    const userId = Object.keys(users).length
    users[userId] = user

    ctx.status = 201
    ctx.set('Location', `user/${userId}`)
    ctx.body = {
        entityType: EntityTypes.user,
        data: {
            ...user
        }
    }
}
