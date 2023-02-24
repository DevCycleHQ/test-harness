# frozen_string_literal: true

require 'sinatra'

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
