'use strict'
const chai = require('chai')
const table = require('./table')
const config = require('../config')
const expect = chai.expect

describe('table', () => {
  describe('export', () => {
    it('should be an object', () => {
      expect(table).to.be.an('object')
    })
  })

  describe('client', () => {
    it('should be an object', () => {
      expect(table.client).to.be.an('object')
    })
  })

  describe('create', () => {
    it('should be a function', () => {
      expect(table.create).to.be.a('function')
    })
  })

  describe('items table instance', () => {
    config({ stage: 'prod' })
    const items = table.create('items')

    it('should be an object', () => {
      expect(items).to.be.a('object')
    })

    describe('getTableName with prefix', () => {
      it('should be a function', () => {
        expect(items.getTableName).to.be.a('function')
      })

      it('should return `items`', () => {
        expect(items.getTableName()).to.equal('prod-items')
      })
    })

    describe('getById', () => {
      it('should be a function', () => {
        expect(items.getById).to.be.a('function')
      })

      it('should return a Promise', () => {
        expect(items.getById('123')).to.be.a('promise')
      })
    })

    describe('getByKey', () => {
      it('should be a function', () => {
        expect(items.getByKey).to.be.a('function')
      })

      it('should return a Promise', () => {
        expect(items.getByKey({})).to.be.a('promise')
      })
    })

    describe('scan', () => {
      it('should be a function', () => {
        expect(items.scan).to.be.a('function')
      })

      it('should return a Promise', () => {
        expect(items.scan()).to.be.a('promise')
      })
    })

    describe('getAll', () => {
      it('should be a function', () => {
        expect(items.getAll).to.be.a('function')
      })

      it('should return a Promise', () => {
        expect(items.getAll()).to.be.a('promise')
      })
    })

    describe('getAllById', () => {
      it('should be a function', () => {
        expect(items.getAllById).to.be.a('function')
      })

      it('should return a Promise', () => {
        expect(items.getAllById([])).to.be.a('promise')
      })
    })

    describe('query', () => {
      it('should be a function', () => {
        expect(items.query).to.be.a('function')
      })

      it('should return a Promise', () => {
        expect(items.query({})).to.be.a('promise')
      })
    })

    describe('query', () => {
      it('should be a function', () => {
        expect(items.query).to.be.a('function')
      })

      it('should return a Promise', () => {
        expect(items.query({})).to.be.a('promise')
      })
    })

    describe('update', () => {
      it('should be a function', () => {
        expect(items.update).to.be.a('function')
      })

      it('should return a Promise', () => {
        expect(items.update({})).to.be.a('promise')
      })
    })

    describe('deleteById', () => {
      it('should be a function', () => {
        expect(items.deleteById).to.be.a('function')
      })

      it('should return a Promise', () => {
        expect(items.deleteById({})).to.be.a('promise')
      })
    })

    describe('getAll with MaxLimit - MaxLimit should be a number', () => {
      it('should return an error', async () => {
        const err = items.getAll({ MaxLimit: true })
        await err.catch(e => {
          expect(e).to.be.an('error')
        })
      })
    })

    describe('getAll with MaxLimit - MaxLimit should be greater than zero', () => {
      it('should return an error', async () => {
        const err = items.getAll({ MaxLimit: 0 })
        await err.catch(e => {
          expect(e).to.be.an('error')
        })
      })
    })

    describe('getAll with MaxLimit and Limit - MaxLimit should not be used with Limit', () => {
      it('should return an error', async () => {
        const err = items.getAll({ MaxLimit: 1, Limit: 1 })
        await err.catch(e => {
          expect(e).to.be.an('error')
        })
      })
    })
  })
})
