---
'@backstage/plugin-catalog-backend': patch
---

Improved performance of the `GET /api/catalog/entity-facets` endpoint. Filtered facet queries (e.g. `?facet=spec.lifecycle&filter=kind=System`) now apply the entity filter against `final_entities` instead of the `search` table directly, avoiding redundant predicate evaluation across the many search rows per entity. A covering index on `(key, original_value, entity_id)` also improves unfiltered facet scans. Catalogs with large numbers of entities should see significantly faster facet queries.
