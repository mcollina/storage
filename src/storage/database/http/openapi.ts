import { Type } from '@sinclair/typebox'

export const STORAGE_DATABASE_HTTP_PREFIX = '/storage/database'

export const storageDatabaseMethodNames = [
  'testObjectPermission',
  'testMoveObjectPermission',
  'testDeleteObjectPermission',
  'createAnalyticsBucketTransaction',
  'deleteEmptyBucket',
  'deleteObjectWithLock',
  'deleteObjectsTransaction',
  'completeUploadTransaction',
  'upsertCopyDestination',
  'moveObjectDestination',
  'acquireObjectLockForTransaction',
  'adjustMultipartUploadProgress',
  'prepareMultipartUploadPart',
  'createBucket',
  'createAnalyticsBucket',
  'findBucketById',
  'countObjectsInBucket',
  'deleteBucket',
  'listObjects',
  'listObjectsV2',
  'listMultipartUploads',
  'listBuckets',
  'mustLockObject',
  'waitObjectLock',
  'updateBucket',
  'upsertObject',
  'updateObject',
  'createObject',
  'deleteObject',
  'deleteObjects',
  'deleteObjectVersions',
  'updateObjectMetadata',
  'updateObjectOwner',
  'findObjects',
  'findObjectVersions',
  'findObject',
  'searchObjects',
  'healthcheck',
  'destroyConnection',
  'createMultipartUpload',
  'findMultipartUpload',
  'updateMultipartUploadProgress',
  'deleteMultipartUpload',
  'insertUploadPart',
  'listParts',
  'deleteAnalyticsBucket',
  'listAnalyticsBuckets',
  'findAnalyticsBucketByName',
] as const

export type StorageDatabaseMethodName = (typeof storageDatabaseMethodNames)[number]

export const storageDatabaseMethodNameSchema = Type.Union(
  storageDatabaseMethodNames.map((method) => Type.Literal(method))
)

export const storageDatabaseRpcRequestSchema = Type.Object({
  args: Type.Array(Type.Unknown()),
})

export const storageDatabaseRpcResponseSchema = Type.Object({
  result: Type.Unknown(),
})

export function createStorageDatabaseOpenApiSchema(prefix = STORAGE_DATABASE_HTTP_PREFIX) {
  const normalizedPrefix = prefix === '/' ? '' : prefix.replace(/\/$/, '')

  return {
    openapi: '3.0.0',
    info: {
      title: 'Storage database HTTP API',
      version: '1.0.0',
    },
    paths: {
      [`${normalizedPrefix}/rpc/{method}`]: {
        post: {
          operationId: 'callStorageDatabaseMethod',
          parameters: [
            {
              name: 'method',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                enum: storageDatabaseMethodNames,
              },
            },
            {
              name: 'x-storage-database-super-user',
              in: 'header',
              required: false,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    args: {
                      type: 'array',
                      items: {},
                    },
                  },
                  required: ['args'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Database method result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      result: {},
                    },
                    required: ['result'],
                  },
                },
              },
            },
          },
        },
      },
    },
  } as const
}
