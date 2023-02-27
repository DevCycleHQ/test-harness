# frozen_string_literal: true

require 'sinatra'
require 'devcycle-ruby-server-sdk'

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
  commandResults: {}
}

post '/client' do
  request.body.rewind
  data = JSON.parse request.body.read

  client_id, sdk_key, wait_for_initialization, options =
    data.values_at('clientId', 'sdkKey', 'waitForInitialization', 'options')

  if client_id.nil?
    status 400
    return { message: 'Invalid request: missing clientId' }.to_json
  end

  begin
    options = DevCycle::DVCOptions.new(
      config_cdn_uri: options.fetch('configCDNURI', 'https://config-cdn.devcycle.com'),
      events_api_uri: options.fetch('eventsAPIURI', 'https://events.devcycle.com'),
      config_polling_interval_ms: options.fetch('configPollingIntervalMS', 10_000),
      event_flush_interval_ms: options.fetch('eventFlushIntervalMS', 1000)
    )

    async_error = nil

    if wait_for_initialization
      begin
        data_store[:clients][client_id] = DevCycle::DVCClient.new(sdk_key, options, true)
      rescue StandardError => e
        async_error = e
      end
    else
      data_store[:clients][client_id] = DevCycle::DVCClient.new(sdk_key, options, false)
    end

    status 201
    headers 'Location' => "/client/#{client_id}"

    return { asyncError: async_error }.to_json if async_error

    { message: 'success' }.to_json
  rescue StandardError => e
    status 200
    { error: e.message }.to_json
  end
end
