---
'@backstage/plugin-catalog-backend': patch
---

Improved performance of entity listing endpoints when the `fields` query parameter is used.

Field projection is now pushed down to the database (using `jsonb_build_object` on PostgreSQL,
`json_object` on SQLite and MySQL) instead of fetching full entity JSON blobs and filtering them in
JavaScript. For large catalogs this can reduce data transfer by over 90% and eliminate thousands of
`JSON.parse` and re-serialization operations per request.

The sort-field lookup in cursor-based pagination now uses a correlated scalar subquery instead of a `LEFT JOIN` + `DISTINCT`, avoiding expensive deduplication over large JSON columns. The streaming page size is
also increased when field projection is active, reducing the number of database round-trips for large
result sets.
