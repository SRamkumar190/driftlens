# InsForge implementation learnings

## Prefer the shortest safe path

For a new, additive table in an otherwise empty backend, use a normal InsForge
migration and verify one real insert. Do not create a backend branch unless the
change is destructive, modifies existing production data or RLS, or the user
explicitly wants isolated testing. Branch provisioning can add several minutes.

Recommended sequence:

1. Create the schema with `npx @insforge/cli db migrations new <name>`.
2. Apply it with `npx @insforge/cli db migrations up <file>`.
3. Run one SDK write.
4. Query the returned ID and stop.

## Do not use `db query` for DDL

`npx @insforge/cli db query` rejects `CREATE TABLE` and other schema-changing
statements, including with `--unrestricted`. Use migrations for schema changes.

## Windows `db import` failure

On Windows, CLI version `0.2.1` crashed when importing SQL into the parent
project after a backend-branch merge:

```text
Error: INVALID_INPUT
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c
```

The failure occurred with both the full schema and an access-only SQL file.
Avoid `db import` for this workflow; use migrations. InsForge bug report:
`0c89ecae-0922-4742-9843-9ca1ff4b49ad`.

## If a backend branch is required

Create and apply the table through an InsForge migration on the branch. Do not
create it with `db import` and rely on the branch's introspected table diff.

The observed branch merge:

- copied the table definition;
- did not copy the RLS-enabled flag or grants;
- created the parent table with owner `postgres`, while migrations run as
  `project_admin`.

That ownership mismatch prevents later migrations from altering the table.
Always inspect the dry-run SQL, then verify the parent table owner, RLS flag,
grants, and policies immediately after merging.

## PostgREST table discovery

Granting a table only to `project_admin` can make PostgREST omit the table from
its schema cache. The admin SDK then returns HTTP 404 even though CLI SQL queries
can see the table.

For this server-only write table:

- enable RLS;
- grant only the required SQL operations (`SELECT`, `INSERT`) to `anon` and
  `authenticated` so PostgREST discovers the relation;
- create no runtime RLS policies, so those roles still cannot access any rows;
- perform writes with the server-only InsForge admin API key.

After changing grants or RLS, reload the PostgREST schema cache.

## Inspect the complete SDK result

The SDK can return an empty-looking `error` object while the useful information
is on the outer result:

```text
{ error: {}, data: null, status: 404, statusText: "Not Found" }
```

When debugging, inspect `error`, `status`, and `statusText` before checking
PostgREST logs and schema visibility.

## Scope and concurrency

Before editing, check `git status` and re-read owned files immediately before
patching. Other contributors may change the RocketRide pipeline or README while
the backend work is running. Preserve those changes and adapt instead of
overwriting them.
