const GLOBAL_SCOPE_ID = 'global'

module.exports = function env (client, _) {
  client.env = {
    async set (key, value, scope = GLOBAL_SCOPE_ID) {
      const kv = await client.kv.open('env')
      const envs = (await kv.get(scope)) || {}
      envs[key] = value
      await kv.put(scope, envs)
    },
    async get (key, scope = GLOBAL_SCOPE_ID) {
      const kv = await client.kv.open('env')
      const envs = (await kv.get(scope)) || {}
      return envs[key]
    },
    async unset (key, scope = GLOBAL_SCOPE_ID) {
      const kv = await client.kv.open('env')
      const envs = (await kv.get(scope)) || {}
      delete envs[key]
      await kv.put(scope, envs)
    },
    async list (scope = GLOBAL_SCOPE_ID) {
      const kv = await client.kv.open('env')
      const envs = (await kv.get(scope)) || {}
      return Object.entries(envs)
    },
    hierarchical (...scopes) {
      return {
        async get (key) {
          for (const scope of scopes) {
            const value = await client.env.get(key, scope)
            if (value !== undefined) {
              return value
            }
          }

          return undefined
        },
        async list () {
          const result = new Map()

          for (const scope of scopes.reverse()) {
            (await client.env.list(scope)).forEach(([k, v]) => result.set(k, v))
          }

          return Array.from(result.entries())
        }
      }
    },
    hierarchicalFromContext (context, minimumScope = 'user') {
      const scopeMap = {
        user: 1,
        channel: 2,
        guild: 3,
        global: 4
      }
      minimumScope = scopeMap[minimumScope] || (() => { throw new Error('invalid minimumScope') })()

      const scopes = []

      if (minimumScope <= scopeMap.user) {
        const user = context.user || context.author
        scopes.push(user.id)
      }

      if (minimumScope <= scopeMap.channel) {
        scopes.push(context.channelId)
      }

      if (minimumScope <= scopeMap.guild && context.guildId) {
        scopes.push(context.guildId)
      }

      if (minimumScope <= scopeMap.global) {
        scopes.push(GLOBAL_SCOPE_ID)
      }

      return this.hierarchical(...scopes)
    }
  }
}
