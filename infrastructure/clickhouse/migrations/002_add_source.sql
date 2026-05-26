-- Add source column to watcher.events to distinguish browser vs server events.
--
-- "browser" = submitted via a public token from the browser SDK (@watcher/browser or @watcher/react).
-- "server"  = submitted via a secret API key from a server-side SDK (@watcher/node, Python, Go).
--
-- LowCardinality keeps storage and query costs near zero for this two-value field.
-- DEFAULT '' preserves backwards compatibility for events ingested before this migration.
ALTER TABLE watcher.events
    ADD COLUMN IF NOT EXISTS source LowCardinality(String) DEFAULT '';
