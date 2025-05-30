## API Report File for "@backstage/plugin-scaffolder-common"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts
import { Entity } from '@backstage/catalog-model';
import type { EntityMeta } from '@backstage/catalog-model';
import type { JsonArray } from '@backstage/types';
import { JsonObject } from '@backstage/types';
import type { JsonValue } from '@backstage/types';
import { KindValidator } from '@backstage/catalog-model';
import type { UserEntity } from '@backstage/catalog-model';

// @public
export const isTemplateEntityV1beta3: (
  entity: Entity,
) => entity is TemplateEntityV1beta3;

// @public
export type TaskRecoverStrategy = 'none' | 'startOver';

// @public
export interface TaskRecovery {
  EXPERIMENTAL_strategy?: TaskRecoverStrategy;
}

// @public
export type TaskSpec = TaskSpecV1beta3;

// @public
export interface TaskSpecV1beta3 {
  apiVersion: 'scaffolder.backstage.io/v1beta3';
  EXPERIMENTAL_recovery?: TaskRecovery;
  output: {
    [name: string]: JsonValue;
  };
  parameters: JsonObject;
  steps: TaskStep[];
  templateInfo?: TemplateInfo;
  user?: {
    entity?: UserEntity;
    ref?: string;
  };
}

// @public
export interface TaskStep {
  action: string;
  each?: string | JsonArray;
  id: string;
  if?: string | boolean;
  input?: JsonObject;
  name: string;
}

// @public
export interface TemplateEntityStepV1beta3 extends JsonObject {
  // (undocumented)
  'backstage:permissions'?: TemplatePermissionsV1beta3;
  // (undocumented)
  action: string;
  // (undocumented)
  id?: string;
  // (undocumented)
  if?: string | boolean;
  // (undocumented)
  input?: JsonObject;
  // (undocumented)
  name?: string;
}

// @public
export interface TemplateEntityV1beta3 extends Entity {
  apiVersion: 'scaffolder.backstage.io/v1beta3';
  kind: 'Template';
  spec: {
    type: string;
    presentation?: TemplatePresentationV1beta3;
    EXPERIMENTAL_recovery?: TemplateRecoveryV1beta3;
    EXPERIMENTAL_formDecorators?: {
      id: string;
      input?: JsonObject;
    }[];
    parameters?: TemplateParametersV1beta3 | TemplateParametersV1beta3[];
    steps: Array<TemplateEntityStepV1beta3>;
    output?: {
      [name: string]: string;
    };
    owner?: string;
    lifecycle?: string;
  };
}

// @public
export const templateEntityV1beta3Validator: KindValidator;

// @public
export type TemplateInfo = {
  entityRef: string;
  baseUrl?: string;
  entity?: {
    metadata: EntityMeta;
  };
};

// @public
export interface TemplateParametersV1beta3 extends JsonObject {
  // (undocumented)
  'backstage:permissions'?: TemplatePermissionsV1beta3;
}

// @public
export interface TemplatePermissionsV1beta3 extends JsonObject {
  // (undocumented)
  tags?: string[];
}

// @public
export interface TemplatePresentationV1beta3 extends JsonObject {
  buttonLabels?: {
    backButtonText?: string;
    createButtonText?: string;
    reviewButtonText?: string;
  };
}

// @public
export interface TemplateRecoveryV1beta3 extends JsonObject {
  EXPERIMENTAL_strategy?: 'none' | 'startOver';
}
```
