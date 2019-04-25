'use strict'

const chai = require('chai')
const config = require('./config')
const expect = chai.expect

describe('config', () => {
  it('should be a function', () => {
    expect(config).to.be.a('function')
  })
})
