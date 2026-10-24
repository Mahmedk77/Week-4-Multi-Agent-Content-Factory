// One-time setup for the passcode rate limit (src/server/rateLimit.ts). Safe to run again.
// npx tsx --env-file=.env.local scripts/setup-rate-limit.ts
import pg from "pg";

const SQL = `
create table if not exists public.unlock_attempts (
    id bigint generated always as identity primary key,
    ip_hash text not null,
    created_at timestamptz not null default now()
);
create index if not exists unlock_attempts_ip_time on public.unlock_attempts (ip_hash, created_at);
-- RLS on with no policies: only the service-role key (server) can touch it, like posts.
alter table public.unlock_attempts enable row level security;
`;

async function main() {
    const url = process.env.SUPABASE_DB_URL;
    if (!url) throw new Error("SUPABASE_DB_URL is missing");
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    try {
        await client.query(SQL);
        console.log("unlock_attempts table ready");
    } finally {
        await client.end();
    }
}

main();
