# ADONIS ASYNC SERIALIZER

# Install

``` npm i adonis_async_serializer ```

# Adonis setup

* Setup as service

providers/AsyncSerializerProvider.js
```javascript
'use strict'

const { ServiceProvider } = require('@adonisjs/fold')
const AdonisAsyncSerializer = require('adonis_async_serializer')

class AsyncSerializerProvider extends ServiceProvider {
  register () {
    this.app.singleton('BaseAsyncSerializer', () => {
      return AdonisAsyncSerializer
    })
  }
}

module.exports = AsyncSerializerProvider

```
start/app.js

```javascript
'use strict'

const path = require('path')

const providers = [
  path.join(__dirname, '..', 'providers', 'AsyncSerializerProvider')
]

//........
```



# Usage
app/Serializers/UserSerializer.js
```javascript
'use strict'

const BaseAsyncSerializer = use('BaseAsyncSerializer')

class UserSerializer extends BaseAsyncSerializer {
  constructor (serializableResource) {
    super(serializableResource)
    
    this.addAttributes(
      'id', 'firstName', 'lastName', 'email'
    )
    
    this.addHasOne('profile', 'ProfileSerializer')
    this.addHasMany('posts', 'PostSerializer')
  }
}

module.exports = UserSerializer
```
app/Controllers/Http/UserController.js
```javascript
'use strict'

const UserSerializer = use('App/Serializers/UserSerializer')

class UserController {
  async show ({ params }) {
    const user = await User.find(params.id)
    const userSerializer = new UserSerializer(user)
    const userSerialized = await userSerializer.toJSON() 
    
    return { resource: userSerialized }
  }
  
  async index () {
    const users = await User.all()
    const userSerializer = new UserSerializer(users)
    const usersSerialized = await userSerializer.toJSON() 
    
    return { resources: usersSerialized }
  }
}
```
## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
