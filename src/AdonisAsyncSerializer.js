'use strict'

let Model = null
const { Config } = require('./Services')
const RelationNotExistsException = require('./Exceptions/RelationNotExistsException')

class AdonisAsyncSerializer {
  constructor (serializableResource, serviceData = {}) {
    if (!Model) {
      Model = use('Model')
    }

    this._serviceData = serviceData
    this._serializableResource = serializableResource
    this._attributes = []
    this._hasOneRelations = []
    this._hasManyRelations = []
    this._callbackResolvers = []
  }

  addAttributes (...attributes) {
    this._attributes = this._attributes.concat(attributes)
  }

  addHasOne (relationName, serializerName) {
    this._hasOneRelations.push({ relationName, serializerName })
  }

  addHasMany (relationName, serializerName) {
    this._hasManyRelations.push({ relationName, serializerName })
  }

  addWithCallback (propertyName, callbackResolver) {
    this._callbackResolvers.push({ propertyName, callbackResolver })
  }

  mergeServiceData (serviceData = {}) {
    this._serviceData = { ...serviceData, ...this._serviceData }
  }

  async toJSON () {
    let result = null

    if (this._isResourceIterable()) {
      result = await this._serializeCollection(this._serializableResource)
    } else {
      result = await this._serializeObj(this._serializableResource)
    }

    return result
  }

  _isResourceIterable () {
    return this._isResourceArray() || this._isResourceSerializerCollection()
  }

  _isResourceArray () {
    return this._serializableResource instanceof Array
  }

  _isResourceSerializerCollection () {
    return this._serializableResource instanceof Model.Serializer || this._serializableResource.rows
  }

  async _serializeObj (serializableObj) {
    const serializedObj = {}
    this._handleAttributes(serializableObj, serializedObj)

    await Promise.all([
      this._handleHasOne(serializableObj, serializedObj),
      this._handleHasMany(serializableObj, serializedObj),
      this._handleCallbackResolvers(serializableObj, serializedObj)
    ])

    return serializedObj
  }

  async _serializeCollection (serializableCollection) {
    let serializableList = null
    if (this._isResourceArray()) {
      serializableList = serializableCollection
    } else {
      serializableList = serializableCollection.rows
    }
    const preparedList = serializableList.map(serializableObj => this._serializeObj(serializableObj))

    return Promise.all(preparedList)
  }

  _handleAttributes (serializableObj, serializedObj) {
    this._attributes.forEach((attribute) => {
      serializedObj[attribute] = serializableObj[attribute]
    })
  }

  async _handleHasOne (serializableObj, serializedObj) {
    const preparedList = this._hasOneRelations.map(({ relationName, serializerName }) => {
      return (async () => {
        const relatedModel = await this._resolveRelation(serializableObj, relationName)
        serializedObj[relationName] = relatedModel ? await this._serializeOne(relatedModel, serializerName) : null
      })()
    })

    await Promise.all(preparedList)
  }

  async _handleHasMany (serializableObj, serializedObj) {
    const preparedList = this._hasManyRelations.map(({ relationName, serializerName }) => {
      return (async () => {
        const relatedModels = await this._resolveRelation(serializableObj, relationName)
        serializedObj[relationName] = await this._serializeMany(relatedModels.rows, serializerName)
      })()
    })

    await Promise.all(preparedList)
  }

  async _handleCallbackResolvers (serializableObj, serializedObj) {
    const preparedList = this._callbackResolvers.map(({ propertyName, callbackResolver }) => {
      return (async () => {
        serializedObj[propertyName] = await callbackResolver(serializableObj, { ...this._serviceData })
      })()
    })

    await Promise.all(preparedList)
  }

  async _serializeMany (relationModels, serializerName) {
    const preparedList = relationModels.map(relatedModel => this._serializeOne(relatedModel, serializerName))

    return Promise.all(preparedList)
  }

  async _serializeOne (relatedModel, serializerName) {
    let serializableObj = null
    if (serializerName) {
      const Serializer = use(AdonisAsyncSerializer.BASE_NAMESPACE + serializerName)
      serializableObj = new Serializer(relatedModel)
      serializableObj.mergeServiceData(this._serviceData)
    } else {
      serializableObj = relatedModel
    }

    return serializableObj.toJSON()
  }

  async _resolveRelation (serializableObj, relationName) {
    if (!serializableObj[relationName]) {
      throw new RelationNotExistsException(`Relation with name [${relationName}] for model [${serializableObj.constructor.name}] doesn't exist! (${this.constructor.name})`)
    }

    return serializableObj[relationName]().fetch()
  }
}

AdonisAsyncSerializer.BASE_NAMESPACE = Config.get('defaultNameSpace')

module.exports = AdonisAsyncSerializer
