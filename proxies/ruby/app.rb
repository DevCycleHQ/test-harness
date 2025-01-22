# frozen_string_literal: true

require 'sinatra'
require 'devcycle-ruby-server-sdk'

require './helpers'
require './utils'

set :port, 3000

get '/hello_world' do
  'Hello World'
end

get '/spec' do
  {
    name: 'Ruby',
    version: '', # TODO: Add branch name or SDK version here
    capabilities: %w[EdgeDB LocalBucketing]
  }.to_json
end

data_store = {
  clients: {},
  command_results: {}
}

post '/client' do
  request.body.rewind
  body = JSON.parse request.body.read

  client_id, sdk_key, wait_for_initialization, options =
    body.values_at('clientId', 'sdkKey', 'waitForInitialization', 'options')

  if client_id.nil?
    status 400
    return { message: 'Invalid request: missing clientId' }.to_json
  end

  begin
    dvc_options = DevCycle::DVCOptions.new(
      config_cdn_uri: options.fetch('configCDNURI', ''),
      events_api_uri: options.fetch('eventsAPIURI', ''),
      config_polling_interval_ms: options.fetch('configPollingIntervalMS', 10_000),
      event_flush_interval_ms: options.fetch('eventFlushIntervalMS', 10_000),
      disable_real_time_updates: true,
    )

    data_store[:clients][client_id] = DevCycle::DVCClient.new(sdk_key, dvc_options, wait_for_initialization)

    status 201
    headers 'Location' => "/client/#{client_id}"
    { message: 'success' }.to_json
  rescue StandardError => e
    status 200
    { exception: e.message }.to_json
  end
end

post %r{\/(client|command\/\w+)\/[\w-]+} do
  request.body.rewind
  body = JSON.parse request.body.read

  command, params, is_async = body.values_at('command', 'params', 'isAsync')
  if command.nil?
    status 404
    return { message: 'Invalid request: missing command' }.to_json
  end

  entity = get_entity_from_location(request.path, data_store)
  if entity.nil?
    status 404
    return { message: 'Invalid request: missing entity' }.to_json
  end

  begin
    parsed_params = parse_params(body, params)
    if parsed_params.include? nil
      status 404
      return { message: 'Invalid request: missing entity' }.to_json
    end

    command = underscore(command)
    result = entity.send(command, *parsed_params)
    entity_type = get_entity_type_from_class_name(result.class.name)
    command_id = data_store[:command_results].length.to_s
    data_store[:command_results][command_id] = result

    status 201
    headers 'Location' => "/command/#{command}/#{command_id}"
    {
      entityType: entity_type,
      data: entity_type == 'Void' ? nil : (command == 'variable_value' ? result : result.to_hash),
      logs: []
    }.to_json
  rescue StandardError => e
    status 200
    if is_async
      { asyncError: e.message }.to_json
    else
      { exception: e.message }.to_json
    end
  end
end
