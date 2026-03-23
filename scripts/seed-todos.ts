/**
 * Seed script for populating the todos table via the Supabase client.
 *
 * For local development, the recommended approach is to use `supabase/seed.sql`
 * which runs automatically on `supabase start` and `supabase db reset`.
 *
 * This script is a convenience for seeding a running Supabase instance
 * (local or remote) via the Management API when you can't run `supabase db reset`.
 *
 * Usage:
 *   npx tsx scripts/seed-todos.ts --user-email <email>
 *   npx tsx scripts/seed-todos.ts --user-email <email> --dry-run
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL   - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY  - Service role key (bypasses RLS)
 */

import { createClient } from "@supabase/supabase-js";

const SEED_TODOS = [
  {
    title: "Buy groceries",
    description: "Milk, eggs, bread, and vegetables",
    time_commitment: "30 minutes",
    finished: false,
  },
  {
    title: "Read a chapter of my book",
    description: 'Continue reading "Designing Data-Intensive Applications"',
    time_commitment: "1 hour",
    finished: false,
  },
  {
    title: "Schedule dentist appointment",
    description: "Call Dr. Smith's office for a cleaning",
    time_commitment: "10 minutes",
    finished: false,
  },
  {
    title: "Reply to Alice's email",
    description: "Respond about the project timeline",
    time_commitment: "15 minutes",
    finished: true,
  },
  {
    title: "Fix the leaky kitchen faucet",
    description: "Replace the washer and check the valve",
    time_commitment: "2 hours",
    finished: false,
  },
  {
    title: "Submit expense report",
    description: "March expenses for client travel",
    time_commitment: "20 minutes",
    finished: true,
  },
];

function parseArgs(args: string[]) {
  const flags = {
    dryRun: false,
    userEmail: "",
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") {
      flags.dryRun = true;
    } else if (args[i] === "--user-email" && args[i + 1]) {
      flags.userEmail = args[++i];
    }
  }

  return flags;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  if (!flags.userEmail) {
    console.error("Missing required flag: --user-email <email>");
    process.exit(1);
  }

  console.log(`Mode: ${flags.dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Target user: ${flags.userEmail}`);
  console.log(`Todos to seed: ${SEED_TODOS.length}`);
  console.log();

  if (flags.dryRun) {
    console.log("Todos that would be inserted:");
    for (const todo of SEED_TODOS) {
      const status = todo.finished ? "✓" : "○";
      console.log(`  ${status} ${todo.title} (${todo.time_commitment})`);
    }
    console.log("\nDry run complete. No changes were made.");
    return;
  }

  // Use service role key to bypass RLS
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Look up the user by email
  const { data: userData, error: userError } =
    await supabase.auth.admin.listUsers();

  if (userError) {
    console.error("Failed to list users:", userError.message);
    process.exit(1);
  }

  const user = userData.users.find((u) => u.email === flags.userEmail);
  if (!user) {
    console.error(`No user found with email: ${flags.userEmail}`);
    process.exit(1);
  }

  console.log(`Found user: ${user.id} (${user.email})`);

  // Insert todos
  const rows = SEED_TODOS.map((todo) => ({
    user_id: user.id,
    title: todo.title,
    description: todo.description,
    time_commitment: todo.time_commitment,
    finished: todo.finished,
  }));

  const { data, error } = await supabase.from("todos").insert(rows).select();

  if (error) {
    console.error("Failed to insert todos:", error.message);
    process.exit(1);
  }

  console.log(`\nSuccessfully inserted ${data.length} todos:`);
  for (const todo of data) {
    const status = todo.finished ? "✓" : "○";
    console.log(`  ${status} ${todo.title} (${todo.id})`);
  }
}

main();
