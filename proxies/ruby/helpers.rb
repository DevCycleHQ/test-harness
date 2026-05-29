# frozen_string_literal: true

def get_entity_from_location(location, data_store)
  url_parts = location.sub(%r{^/}, '').split('/')
  location_type, *location_path = url_parts
  case location_type
  when 'command'
    entity_type, entity_id = location_path
    return data_store[:command_results][entity_type][entity_id]
  when 'client'
    client_id = location_path[0]
    return data_store[:clients][client_id]
  end
  nil
end

def parse_params(body, params)
  parsed_params = []
  params.each do |param|
    if param['callbackURL']
      parsed_params.push(param['callbackURL'])
    elsif param['type']
      parsed_params.push(get_entity_from_param_type(param['type'], body))
    else
      parsed_params.push(param['value'])
    end
  end
  parsed_params
end

def get_entity_from_param_type(type, body)
  case type
  when 'user'
    req_body_user = body['user']
    user_data = DevCycle::UserData.new
    user_data.user_id = req_body_user['user_id'] if req_body_user['user_id']
    user_data.email = req_body_user['email'] if req_body_user['email']
    user_data.name = req_body_user['name'] if req_body_user['name']
    user_data.language = req_body_user['language'] if req_body_user['language']
    user_data.country = req_body_user['country'] if req_body_user['country']
    user_data.appVersion = req_body_user['appVersion'] if req_body_user['appVersion']
    user_data.appBuild = req_body_user['appBuild'] if req_body_user['appBuild']
    user_data.customData = req_body_user['customData'] if req_body_user['customData']
    user_data.privateCustomData = req_body_user['privateCustomData'] if req_body_user['privateCustomData']
    user_data.deviceModel = req_body_user['deviceModel'] if req_body_user['deviceModel']
    return user_data
  when 'event'
    req_body_event = body['event']
    event = DevCycle::Event.new
    event.type = req_body_event['type'] if req_body_event['type']
    event.target = req_body_event['target'] if req_body_event['target']
    event.date = req_body_event['date'] if req_body_event['date']
    event.value = req_body_event['value'] if req_body_event['value']
    event.metaData = req_body_event['metaData'] if req_body_event['metaData']
    return event
  end
  nil
end

def get_entity_type_from_class_name(class_name)
  entity_type = class_name == 'NilClass' ? 'Void' : class_name.split('::').last
  case entity_type
  when 'DVCClient', 'DVCCloudClient'
    return 'Client'
  when 'Hash'
    return 'Object'
  end
  entity_type
end
