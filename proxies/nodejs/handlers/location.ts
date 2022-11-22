import Koa from 'koa'
import { DVCClient, DVCUser } from '@devcycle/nodejs-server-sdk'

type LocationRequestBody = {
    command: string
    params: string //[{value: string | number | boolean} | {location: string} | {callbackUrl: string}] HTTP request comes in as string
    isAsync: boolean
  }

export const handleLocation = async (ctx:Koa.ParameterizedContext, data: {clients: { [key: string]: DVCClient }, users: { [key: string]: DVCUser }}) => {
    const body = ctx.request.body as LocationRequestBody
    const urlParts = ctx.request.url.split('/')
    console.log(urlParts)
    let entity = getEntityFromLocation(ctx.request.url, data);
    console.log("entity", entity)
  
    if(entity === undefined){
      ctx.status = 400
      ctx.body = {
        errorCode: 400,
        errorMessage: "Invalid request: missing entity"
      }
    } else if (body.command === undefined){
      ctx.status = 400
      ctx.body = {
        errorCode: 400, 
        errorMessage: "Invalid request: missing command"
  
      }
    } else {
      const command = body.command;
      const params: (any|string|boolean|number) = parseParams(JSON.parse(body.params), data);
      const resultData = entity[command](...params);
    
      ctx.status = 200
      ctx.body = {
        entityType: typeof(resultData),
        data: resultData,
        logs: [] // TODO add logs here
      }
    }
  }
  
  const getEntityFromLocation = (location, data) => {
    const urlParts = location.split('/')
    const entityType = urlParts[urlParts.length - 2]
    const id = urlParts[urlParts.length - 1]
    let entity;
    if(entityType === "user"){
      entity = data.users[id];
    }
    if(entityType === "client"){
      entity = data.clients[id];
    }
    return entity;
  }
  
  const parseParams = (params, data):(string | boolean | number | any)[] => {
    const parsedParams :(string| boolean| number| any)[] = [];
    params.forEach(element => {
      if(element.value !== undefined){
        parsedParams.push(element.value);
      } else if(element.location !== undefined){
        parsedParams.push(getEntityFromLocation(element.location, data))
      }
    });
    return parsedParams;
  }
  