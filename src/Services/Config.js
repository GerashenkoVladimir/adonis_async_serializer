'use strict'

const config = require('../../config/config')

class Config {
  static get (key, defaultValue) {
    return config[key] || defaultValue
  }
}

module.exports = Config
