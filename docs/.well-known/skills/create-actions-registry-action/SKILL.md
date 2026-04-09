---
name: create-actions-registry-action
description: Create new actions and register them with the Backstage ActionsRegistryService. Use this skill when adding new agentic actions to a backend plugin, making backend capabilities callable by agents (via the MCP backend) or usable in scaffolder templates, or when you need to expose plugin functionality as structured, schema-validated actions.
---

# Creating Actions for the Backstage ActionsRegistryService

This skill explains how to register new actions with the Backstage `ActionsRegistryService`, which exposes backend plugin capabilities via a structured, schema-validated interface. Registered actions can be invoked in two ways:

- **By agents** — via the Backstage MCP backend, which surfaces registered actions as MCP tools
- **In scaffolder templates** — as steps within a `Template` entity's `spec.steps`

## Overview

The `ActionsRegistryService` allows backend plugins to register named actions that agents and scaffolder templates can discover and invoke. Each action has:

- A unique **name** (kebab-case, no namespace prefix required)
- A **title** and **description** explaining what the action does and when to use it — write these for an agent/template-author audience
- A **Zod schema** for input and output validation
- An **action handler** that performs the actual work
- Optional **attributes** to signal safety characteristics

### Action IDs

When an action is registered with `name: 'my-action-name'` in a plugin with `pluginId: 'my-plugin'`, the framework constructs a fully-qualified ID as `<pluginId>:<name>` — e.g. `my-plugin:my-action-name`. This is the ID used in the HTTP API and in scaffolder template steps (`action: my-plugin:my-action-name`).

When surfaced via the MCP backend, the action becomes an MCP tool named `<pluginId>.<name>` (dot-separated) by default — e.g. `my-plugin.my-action-name`. You do not control this naming directly; it derives from the plugin ID and the action `name` you register.

## TypeScript Interface

```typescript
// packages/backend-plugin-api/src/services/definitions/ActionsRegistryService.ts
import { z, AnyZodObject } from 'zod/v3';
import { BasicPermission } from '@backstage/plugin-permission-common';
import { LoggerService } from './LoggerService';
import { BackstageCredentials } from './AuthService';

export type ActionsRegistryActionContext<TInputSchema extends AnyZodObject> = {
  input: z.infer<TInputSchema>; // Validated input data
  logger: LoggerService; // Logging
  credentials: BackstageCredentials; // Auth credentials (pass to service calls)
};

export type ActionsRegistryActionOptions<
  TInputSchema extends AnyZodObject,
  TOutputSchema extends AnyZodObject,
> = {
  name: string; // Unique kebab-case identifier, e.g. "get-catalog-entity"
  title: string; // Human/agent readable title
  description: string; // Detailed description — include examples of when to use this
  schema: {
    input: (zod: typeof z) => TInputSchema; // Zod object schema for input
    output: (zod: typeof z) => TOutputSchema; // Zod object schema for output
  };
  examples?: Array<{
    title: string;
    description?: string;
    input: z.infer<TInputSchema>;
    output?: z.infer<TOutputSchema>;
  }>;
  visibilityPermission?: BasicPermission; // Permission required to see this action
  attributes?: {
    destructive?: boolean; // true if action modifies or deletes data
    idempotent?: boolean; // true if safe to call multiple times with same result
    readOnly?: boolean; // true if action only reads data
  };
  // When TOutputSchema infers to void (e.g. z.void()), the handler may return void.
  // Otherwise it must return { output: z.infer<TOutputSchema> }.
  action: (
    context: ActionsRegistryActionContext<TInputSchema>,
  ) => Promise<
    z.infer<TOutputSchema> extends void
      ? void
      : { output: z.infer<TOutputSchema> }
  >;
};

export interface ActionsRegistryService {
  register<
    TInputSchema extends AnyZodObject,
    TOutputSchema extends AnyZodObject,
  >(
    options: ActionsRegistryActionOptions<TInputSchema, TOutputSchema>,
  ): void;
}
```

## Step-by-Step: Creating a New Action

### Step 1: Create the action file

Create a new file `src/actions/createMyAction.ts` in your plugin:

```typescript
import { ActionsRegistryService } from '@backstage/backend-plugin-api/alpha';
import { MyService } from '../services/MyService';

export const createMyAction = ({
  myService,
  actionsRegistry,
}: {
  myService: MyService;
  actionsRegistry: ActionsRegistryService;
}) => {
  actionsRegistry.register({
    name: 'my-action-name',
    title: 'Human-Readable Action Title',
    description: `
Detailed description explaining what this action does.

Include:
- What problem this action solves
- When to use it (and when NOT to)
- What the inputs and outputs mean
- Any important domain context
    `,
    attributes: {
      destructive: false, // Does not delete or irreversibly modify data
      readOnly: true, // Only reads data
      idempotent: true, // Safe to call multiple times
    },
    schema: {
      input: z =>
        z.object({
          requiredField: z
            .string()
            .describe('Description for the agent or template author'),
          optionalField: z
            .string()
            .optional()
            .describe('Optional field description'),
        }),
      output: z =>
        z.object({
          result: z.string().describe('The result of the action'),
        }),
    },
    examples: [
      {
        title: 'Basic usage',
        description: 'An example showing typical usage',
        input: { requiredField: 'example-value' },
        output: { result: 'expected-output' },
      },
    ],
    action: async ({ input, credentials, logger }) => {
      logger.info(`Executing my action with: ${input.requiredField}`);

      const result = await myService.doSomething(input.requiredField, {
        credentials, // Always pass credentials to service calls
      });

      return {
        output: {
          result,
        },
      };
    },
  });
};
```

### Step 2: Export the action creator from the actions index

Create or update `src/actions/index.ts`:

```typescript
import { ActionsRegistryService } from '@backstage/backend-plugin-api/alpha';
import { MyService } from '../services/MyService';
import { createMyAction } from './createMyAction';
// import other actions...

export const createMyPluginActions = (options: {
  actionsRegistry: ActionsRegistryService;
  myService: MyService;
}) => {
  createMyAction(options);
  // register other actions...
};
```

### Step 3: Register the actions in your plugin

In your plugin's `src/plugin.ts` (or equivalent), add `actionsRegistryServiceRef` as a dependency and call your action creators:

```typescript
import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import {
  actionsRegistryServiceRef,
} from '@backstage/backend-plugin-api/alpha';
import { createMyPluginActions } from './actions';

export const myPlugin = createBackendPlugin({
  pluginId: 'my-plugin',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        actionsRegistry: actionsRegistryServiceRef,
        // ... other deps
      },
      async init({ logger, actionsRegistry, /* ... */ }) {
        // ... other initialization

        createMyPluginActions({
          actionsRegistry,
          myService: /* your service instance */,
        });
      },
    });
  },
});
```

## Attributes Reference

Always set all three attributes explicitly:

| Attribute     | When `true`                                                     | When `false`                   |
| ------------- | --------------------------------------------------------------- | ------------------------------ |
| `readOnly`    | Action only reads data, no side effects                         | Action has side effects        |
| `destructive` | Action deletes or irreversibly modifies data                    | Action is safe / additive      |
| `idempotent`  | Calling multiple times with the same input produces same result | Each call may have new effects |

## Description Writing Guidelines

Descriptions are read by agents (via MCP) and template authors to decide when and how to invoke your action. Write them accordingly:

- **State the purpose clearly** in the first sentence
- **Explain the domain model** the action operates on
- **List important constraints** (e.g., required formats, limits)
- **Show query/filter syntax** if the action takes complex structured input
- **Use markdown headers** to organize sections for longer descriptions
- **Give concrete examples** of valid inputs inline

See `createQueryCatalogEntitiesAction` in `plugins/catalog-backend/src/actions/` for an excellent example of a well-documented action description with inline query syntax examples.

## Schema Best Practices

- Use `.describe()` on every field — agents and template authors use these to understand what to pass
- Use `.optional()` for truly optional fields; do not use optional as a workaround for missing input
- Use `z.enum([...])` when a field only accepts a fixed set of values
- Use `z.object({}).passthrough()` for output when the shape is not known (e.g., returning an arbitrary entity)
- Nest objects to group related fields logically
- Use `z.union([...])` for mutually exclusive input shapes

### Entity Input Convention

When an action needs to look up a catalog entity by identity, always accept the entity using this standard input shape:

```typescript
input: z =>
  z.object({
    name: z.string().describe('The name of the catalog entity.'),
    kind: z
      .string()
      .optional()
      .describe(
        'The kind of the catalog entity, e.g. "Component", "Service". Defaults to "Component" if omitted.',
      ),
    namespace: z
      .string()
      .optional()
      .describe(
        'The namespace of the catalog entity. Defaults to "default" if omitted.',
      ),
  }),
```

This convention is consistent across catalog-related actions and makes it easy for agents to provide partial input (e.g. just `name`) while still supporting disambiguation via `kind` or `namespace` when needed.

## Error Handling

Throw typed errors from `@backstage/errors` in your action handler:

```typescript
import { InputError, NotFoundError, ConflictError } from '@backstage/errors';

// Bad user input
throw new InputError(`Invalid URL: ${input.url}`);

// Entity not found
throw new NotFoundError(`Entity "${input.name}" not found`);

// Ambiguous result
throw new ConflictError(`Multiple matches found: ${names.join(', ')}`);
```

## Permissions

Actions support two levels of permission control: **visibility permissions** (declarative, evaluated by the framework) and **runtime permission checks** (imperative, evaluated inside the action handler).

### Visibility Permission

`visibilityPermission` is an optional field on the action registration that declares a `BasicPermission` controlling whether the action is visible and accessible at all. When set, the framework evaluates this permission before accepting an invocation — callers without the required permission cannot discover or call the action.

Define a permission using `createPermission` and assign it to `visibilityPermission`:

```typescript
import { createPermission } from '@backstage/plugin-permission-common';

const myActionPermission = createPermission({
  name: 'myPlugin.myAction.use',
  attributes: {},
});

actionsRegistry.register({
  name: 'my-action',
  title: 'My Action',
  description: '...',
  visibilityPermission: myActionPermission,
  schema: { ... },
  action: async ({ input, credentials }) => {
    // ...
  },
});
```

Export the permission from your plugin's permissions file so adopters can wire it into their permission policies.

Actions without `visibilityPermission` are available to all callers.

### Runtime Permission Checks

For fine-grained access control (e.g., per-resource authorization, conditional decisions), inject `PermissionsService` into your action and call `permissions.authorize(...)` inside the handler. Import `AuthorizeResult` and `NotAllowedError` to handle the decision:

```typescript
import { PermissionsService } from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { NotAllowedError } from '@backstage/errors';
import { myResourceDeletePermission } from '../permissions';

export const createDeleteMyResourceAction = ({
  db,
  permissions,
  actionsRegistry,
}: {
  db: MyDatabaseService;
  permissions: PermissionsService;
  actionsRegistry: ActionsRegistryService;
}) => {
  actionsRegistry.register({
    name: 'delete-my-resource',
    title: 'Delete My Resource',
    description: '...',
    attributes: {
      destructive: true,
      readOnly: false,
      idempotent: false,
    },
    schema: {
      input: z => z.object({ resourceId: z.string().uuid() }),
      output: z => z.object({ deleted: z.boolean() }),
    },
    action: async ({ input, credentials }) => {
      const [decision] = await permissions.authorize(
        [{ permission: myResourceDeletePermission }],
        { credentials },
      );

      if (decision.result === AuthorizeResult.DENY) {
        throw new NotAllowedError(
          `Not allowed to delete resource "${input.resourceId}"`,
        );
      }

      await db.deleteResource(input.resourceId, { credentials });
      return { output: { deleted: true } };
    },
  });
};
```

Always pass `credentials` to `permissions.authorize(...)` — this is how the permission framework authenticates the caller.

## Testing Actions

Use `actionsRegistryServiceMock` from `@backstage/backend-test-utils/alpha` to test your actions without a full backend. The mock registers actions with a `test:` namespace prefix (e.g., `test:my-action-name`) and validates input/output against the declared Zod schemas. You can override specific service methods with `jest.fn()` to control behavior in each test.

```typescript
import { actionsRegistryServiceMock } from '@backstage/backend-test-utils/alpha';
import { createGetMyResourceAction } from './createGetMyResourceAction';

describe('createGetMyResourceAction', () => {
  it('should return a resource when found', async () => {
    const mockActionsRegistry = actionsRegistryServiceMock();

    // Create a mock of your service with controlled behavior
    const mockDb = {
      getResourceById: jest.fn().mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'my-resource',
        type: 'typeA',
        metadata: { owner: 'team-a' },
      }),
    } as unknown as MyDatabaseService;

    createGetMyResourceAction({
      db: mockDb,
      actionsRegistry: mockActionsRegistry,
    });

    const result = await mockActionsRegistry.invoke({
      id: 'test:get-my-resource', // note: mock uses "test:" prefix
      input: { resourceId: '123e4567-e89b-12d3-a456-426614174000' },
    });

    expect(result.output).toEqual({
      resourceId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'my-resource',
      type: 'typeA',
      metadata: { owner: 'team-a' },
    });
    expect(mockDb.getResourceById).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000',
      expect.objectContaining({ credentials: expect.any(Object) }),
    );
  });

  it('should throw NotFoundError when resource does not exist', async () => {
    const mockActionsRegistry = actionsRegistryServiceMock();

    const mockDb = {
      getResourceById: jest.fn().mockResolvedValue(undefined),
    } as unknown as MyDatabaseService;

    createGetMyResourceAction({
      db: mockDb,
      actionsRegistry: mockActionsRegistry,
    });

    await expect(
      mockActionsRegistry.invoke({
        id: 'test:get-my-resource',
        input: { resourceId: '123e4567-e89b-12d3-a456-426614174000' },
      }),
    ).rejects.toThrow(
      `Resource "123e4567-e89b-12d3-a456-426614174000" not found`,
    );
  });

  it('should throw on invalid input', async () => {
    const mockActionsRegistry = actionsRegistryServiceMock();
    const mockDb = {
      getResourceById: jest.fn(),
    } as unknown as MyDatabaseService;

    createGetMyResourceAction({
      db: mockDb,
      actionsRegistry: mockActionsRegistry,
    });

    // The mock validates against the Zod schema before calling the action handler
    await expect(
      mockActionsRegistry.invoke({
        id: 'test:get-my-resource',
        input: { resourceId: 'not-a-uuid' }, // fails z.string().uuid()
      }),
    ).rejects.toThrow();
  });
});
```

### Key Testing Patterns

- Always use `test:<action-name>` as the `id` when invoking — the mock uses `test:` as a fixed namespace prefix
- Use `jest.fn()` to control return values and assert call arguments
- Test the success path, the not-found path, and invalid-input path at minimum
- The mock validates input and output against the Zod schema — use this to test schema correctness too
- To pass custom credentials in a test, provide `credentials` to `mockActionsRegistry.invoke(...)`: the mock defaults to `mockCredentials.none()` if omitted

## Complete Example: Read-Only Lookup Action

```typescript
// src/actions/createGetMyResourceAction.ts
import { ActionsRegistryService } from '@backstage/backend-plugin-api/alpha';
import { InputError, NotFoundError } from '@backstage/errors';
import { MyDatabaseService } from '../services/MyDatabaseService';

export const createGetMyResourceAction = ({
  db,
  actionsRegistry,
}: {
  db: MyDatabaseService;
  actionsRegistry: ActionsRegistryService;
}) => {
  actionsRegistry.register({
    name: 'get-my-resource',
    title: 'Get My Resource',
    description: `
Fetches a single resource by its unique identifier from the my-plugin database.

Each resource has a unique \`resourceId\` which is a UUID. Resources also have a \`name\` (human-readable), a \`type\` (one of "typeA", "typeB"), and optional \`metadata\`.

## When to use

Use this action to look up a specific resource by ID before performing operations on it, or to check the current state of a resource.
    `,
    attributes: {
      destructive: false,
      readOnly: true,
      idempotent: true,
    },
    schema: {
      input: z =>
        z.object({
          resourceId: z
            .string()
            .uuid()
            .describe('UUID of the resource to fetch'),
        }),
      output: z =>
        z.object({
          resourceId: z.string().uuid().describe('The resource UUID'),
          name: z.string().describe('The human-readable resource name'),
          type: z.enum(['typeA', 'typeB']).describe('The resource type'),
          metadata: z
            .record(z.string())
            .optional()
            .describe('Optional key-value metadata'),
        }),
    },
    examples: [
      {
        title: 'Fetch a resource by ID',
        input: { resourceId: '123e4567-e89b-12d3-a456-426614174000' },
        output: {
          resourceId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'my-resource',
          type: 'typeA',
        },
      },
    ],
    action: async ({ input, credentials, logger }) => {
      logger.info(`Fetching resource: ${input.resourceId}`);

      const resource = await db.getResourceById(input.resourceId, {
        credentials,
      });

      if (!resource) {
        throw new NotFoundError(`Resource "${input.resourceId}" not found`);
      }

      return {
        output: {
          resourceId: resource.id,
          name: resource.name,
          type: resource.type,
          metadata: resource.metadata,
        },
      };
    },
  });
};
```

## Checklist

When creating a new action:

- [ ] Action file created at `src/actions/create<ActionName>Action.ts`
- [ ] Action exported from `src/actions/index.ts`
- [ ] `actionsRegistryServiceRef` added to plugin deps in `plugin.ts`
- [ ] Action creator called in plugin `init()`
- [ ] `name` is unique, kebab-case
- [ ] `description` explains domain context and is written for an agent or template author
- [ ] All schema fields have `.describe()` documentation
- [ ] `attributes.destructive`, `attributes.readOnly`, and `attributes.idempotent` are all set
- [ ] `credentials` passed to all downstream service calls
- [ ] Typed errors (`InputError`, `NotFoundError`, etc.) thrown for expected failure cases
- [ ] At least one `examples` entry provided
- [ ] `visibilityPermission` set if the action should not be universally accessible
- [ ] Runtime `permissions.authorize(...)` calls added for any per-resource or conditional access control
- [ ] Entity lookup inputs use the standard `name` / `kind` / `namespace` shape (see Entity Input Convention)
- [ ] Tests written using `actionsRegistryServiceMock` covering success, not-found, and invalid-input cases
