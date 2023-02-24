# frozen_string_literal: true

require 'sinatra'

set :port, 3000

get '/hello_world' do
  'Hello World'
end
