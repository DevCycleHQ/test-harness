import Koa from 'koa'
import { DVCClient, initialize } from '@devcycle/nodejs-server-sdk'

type ClientRequestBody = {
  clientId: string
  sdkKey: string
  options: { [key: string]: string }
}

export const handleClient = async (ctx: Koa.ParameterizedContext, clients: { [key: string]: DVCClient }) => {
  const body = <ClientRequestBody>ctx.request.body
  if (body.clientId === undefined) {
    ctx.status = 400
    ctx.body = {
      error: "Invalid request: missing clientId"
    }
  } else {
    const client = initialize(body.sdkKey, body.options)
    clients[body.clientId] = client
    ctx.status = 201
    ctx.set('Location',`client/${body.clientId}`)
  }
}
