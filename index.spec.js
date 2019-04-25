const dynamomo = require('./index')

var chai = require('chai')
const expect = chai.expect

describe('dynamomo', () => {
  describe('export', () => {
    it('should be an object', () => {
      expect(dynamomo).to.be.a('object')
    })
  })
})
