#!/usr/bin/env ruby

require 'sinatra'
use Rack::CommonLogger

get '/' do
  File.read File.join settings.root, 'public', 'index.html'
end
