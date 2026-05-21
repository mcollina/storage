import { TenantConnection } from '@internal/database'
import { buildOpenAPIClient, PlatformaticClientOptions } from 'massimo'
import { Database } from '../adapter'
import {
  createStorageDatabaseOpenApiSchema,
  STORAGE_DATABASE_HTTP_PREFIX,
  StorageDatabaseMethodName,
  storageDatabaseMethodNames,
} from './openapi'

interface MassimoStorageDatabaseClient {
  callStorageDatabaseMethod(request: {
    path: { method: StorageDatabaseMethodName }
    headers?: Record<string, string>
    body: { args: unknown[] }
  }): Promise<{ result: unknown }>
}

export interface StorageDatabaseHttpClientOptions
  extends Omit<PlatformaticClientOptions, 'path' | 'fullRequest' | 'fullResponse'> {
  tenantId: string
  tenantHost: string
  reqId?: string
  sbReqId?: string
  role?: string
  prefix?: string
}

export class StorageDatabaseHttpClient {
  public readonly tenantId: string
  public readonly tenantHost: string
  public readonly reqId?: string
  public readonly sbReqId?: string
  public readonly role?: string
  public readonly connection: TenantConnection

  private constructor(
    private readonly client: MassimoStorageDatabaseClient,
    private readonly options: StorageDatabaseHttpClientOptions,
    private readonly superUser = false
  ) {
    this.tenantId = options.tenantId
    this.tenantHost = options.tenantHost
    this.reqId = options.reqId
    this.sbReqId = options.sbReqId
    this.role = options.role
    this.connection = undefined as unknown as TenantConnection
  }

  static async create(options: StorageDatabaseHttpClientOptions) {
    const client = await buildOpenAPIClient<MassimoStorageDatabaseClient>({
      ...options,
      path: await createMassimoSchemaPath(options.prefix),
      fullRequest: true,
      fullResponse: false,
    })

    return new StorageDatabaseHttpClient(client, options) as StorageDatabaseHttpClient & Database
  }

  tenant() {
    return {
      ref: this.tenantId,
      host: this.tenantHost,
    }
  }

  asSuperUser() {
    return new StorageDatabaseHttpClient(
      this.client,
      this.options,
      true
    ) as StorageDatabaseHttpClient & Database
  }

  async callDatabaseMethod(method: StorageDatabaseMethodName, args: unknown[]) {
    const response = await this.client.callStorageDatabaseMethod({
      path: { method },
      headers: this.superUser ? { 'x-storage-database-super-user': 'true' } : undefined,
      body: { args },
    })

    return response.result
  }
}

export interface StorageDatabaseHttpClient extends Database {}

for (const method of storageDatabaseMethodNames) {
  const value = function storageDatabaseHttpClientMethod(
    this: StorageDatabaseHttpClient,
    ...args: unknown[]
  ) {
    return this.callDatabaseMethod(method, args)
  }

  Object.defineProperty(StorageDatabaseHttpClient.prototype, method, { value })
}

export async function createStorageDatabaseHttpClient(options: StorageDatabaseHttpClientOptions) {
  return StorageDatabaseHttpClient.create(options)
}

async function createMassimoSchemaPath(prefix = STORAGE_DATABASE_HTTP_PREFIX) {
  const { mkdtemp, writeFile } = await import('fs/promises')
  const { join } = await import('path')
  const { tmpdir } = await import('os')
  const directory = await mkdtemp(join(tmpdir(), 'storage-database-openapi-'))
  const schemaPath = join(directory, 'openapi.json')

  await writeFile(schemaPath, JSON.stringify(createStorageDatabaseOpenApiSchema(prefix)))

  return schemaPath
}
