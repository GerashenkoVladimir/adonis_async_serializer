'use strict'

let Model = null
const { Config } = require('./Services')

class AdonisAsyncSerializer {
  constructor(serializableResource) {
    if (!Model) {
      Model = use('Model')
    }

    this._serializableResource = serializableResource
    this._attributes = []
    this._hasOneRelations = []
    this._hasManyRelations = []
  }

  addAttributes(...attributes) {
    this._attributes = this._attributes.concat(attributes)
  }

  addHasOne(relationName, serializerName) {
    this._hasOneRelations.push({relationName, serializerName})
  }

  addHasMany(relationName, serializerName) {
    this._hasManyRelations.push({relationName, serializerName})
  }

  async toJSON() {
    let result = null

    if (this._isResourceIterable()) {
      result = await this._serializeCollection(this._serializableResource)
    } else {
      result = await this._serializeObj(this._serializableResource)
    }

    return result
  }

  _isResourceIterable() {
    return this._isResourceArray() || this._isResourceSerializerCollection()
  }

  _isResourceArray() {
    return this._serializableResource instanceof Array
  }

  _isResourceSerializerCollection() {
    return this._serializableResource instanceof Model.Serializer || this._serializableResource.rows
  }

  async _serializeObj(serializableObj) {
    const serializedObj = {}
    this._handleAttributes(serializableObj, serializedObj)
    await this._handleHasOne(serializableObj, serializedObj)
    await this._handleHasMany(serializableObj, serializedObj)
    return serializedObj
  }

  async _serializeCollection(serializableCollection) {
    let serializableList = null
    if (this._isResourceArray()) {
      serializableList = serializableCollection
    } else {
      serializableList = serializableList.rows
    }
    const serializedCollection = []
    for (const serializableObj of serializableList) {
      serializedCollection.push(await this._serializeObj(serializableObj))
    }

    return serializedCollection
  }

  _handleAttributes(serializableObj, serializedObj) {
    this._attributes.forEach((attribute) => {
      serializedObj[attribute] = serializableObj[attribute]
    })
  }

  async _handleHasOne(serializableObj, serializedObj) {
    for (const {relationName, serializerName} of this._hasOneRelations) {
      const relatedModel = await serializableObj[relationName]().fetch()
      serializedObj[relationName] = relatedModel ? await this._serializeOne(relatedModel, serializerName) : null
    }
  }

  async _handleHasMany(serializableObj, serializedObj) {
    for (const {relationName, serializerName} of this._hasManyRelations) {
      const relatedModels = await serializableObj[relationName]().fetch()
      serializedObj[relationName] = await this._serializeMany(relatedModels.rows, serializerName)
    }
  }

  async _serializeMany(relationModels, serializerName) {
    const serializedObjects = []
    for (const relatedModel of relationModels) {
      serializedObjects.push(await this._serializeOne(relatedModel, serializerName))
    }
    return serializedObjects
  }

  async _serializeOne(relatedModel, serializerName) {
    let serializableObj = null
    if (serializerName) {
      const Serializer = use(AdonisAsyncSerializer.BASE_NAMESPACE + serializerName)
      serializableObj = new Serializer(relatedModel)
    } else {
      serializableObj = relatedModel
    }

    return serializableObj.toJSON()
  }
}

AdonisAsyncSerializer.BASE_NAMESPACE = Config.get('defaultNameSpace')

module.exports = AdonisAsyncSerializer
