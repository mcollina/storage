import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import Fastify, { FastifyInstance, FastifyRequest } from 'fastify'
import { Database } from '../adapter'
import {
  createStorageDatabaseOpenApiSchema,
  STORAGE_DATABASE_HTTP_PREFIX,
  storageDatabaseMethodNameSchema,
  storageDatabaseMethodNames,
  storageDatabaseRpcRequestSchema,
  storageDatabaseRpcResponseSchema,
} from './openapi'

export interface StorageDatabaseHttpServerOptions {
  database: Database | ((request: FastifyRequest) => Database | Promise<Database>)
  prefix?: string
}

const storageDatabaseMethodNameSet = new Set<string>(storageDatabaseMethodNames)

async function resolveDatabase(request: FastifyRequest, options: StorageDatabaseHttpServerOptions) {
  const database =
    typeof options.database === 'function' ? await options.database(request) : options.database

  if (request.headers['x-storage-database-super-user'] === 'true') {
    return database.asSuperUser()
  }

  return database
}

export async function storageDatabaseHttpRoutes(
  fastify: FastifyInstance,
  options: StorageDatabaseHttpServerOptions
) {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>()

  app.get('/openapi.json', async () => createStorageDatabaseOpenApiSchema(options.prefix))

  app.post(
    '/rpc/:method',
    {
      schema: {
        summary: 'Call a storage database method',
        tags: ['storage-database'],
        params: {
          type: 'object',
          properties: {
            method: storageDatabaseMethodNameSchema,
          },
          required: ['method'],
        },
        headers: {
          type: 'object',
          properties: {
            'x-storage-database-super-user': { type: 'string' },
          },
        },
        body: storageDatabaseRpcRequestSchema,
        response: {
          200: storageDatabaseRpcResponseSchema,
        },
      },
    },
    async (request) => {
      const { method } = request.params as { method: string }

      if (!storageDatabaseMethodNameSet.has(method)) {
        throw new Error(`Unsupported storage database method: ${method}`)
      }

      const database = await resolveDatabase(request, options)
      const handler = database[method as keyof Database]

      if (typeof handler !== 'function') {
        throw new Error(`Storage database member is not callable: ${method}`)
      }

      const result = await (handler as (...args: unknown[]) => Promise<unknown>).apply(
        database,
        request.body.args
      )
      return { result: result ?? null }
    }
  )
}

export function createStorageDatabaseHttpApplication(options: StorageDatabaseHttpServerOptions) {
  const app = Fastify().withTypeProvider<TypeBoxTypeProvider>()
  const prefix = options.prefix ?? STORAGE_DATABASE_HTTP_PREFIX

  app.register(storageDatabaseHttpRoutes, { ...options, prefix })

  return app
}
