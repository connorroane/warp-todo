import { createClient } from "@supabase/supabase-js";

const SEED_TODOS = [
  { title: "Buy groceries", is_complete: false },
  { title: "Read a chapter of my book", is_complete: false },
  { title: "Schedule dentist appointment", is_complete: false },
  { title: "Reply to Alice's email", is_complete: true },
  { title: "Fix the leaky kitchen faucet", is_complete: false },
  { title: "Submit expense report", is_complete: true },
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
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    console.error(
      "Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
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
      const status = todo.is_complete ? "✓" : "○";
      console.log(`  ${status} ${todo.title}`);
    }
    console.log("\nDry run complete. No changes were made.");
    return;
  }

  // Use service role key to bypass RLS
  const supabase = createClient(supabaseUrl, secretKey, {
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
    is_complete: todo.is_complete,
  }));

  const { data, error } = await supabase.from("todos").insert(rows).select();

  if (error) {
    console.error("Failed to insert todos:", error.message);
    process.exit(1);
  }

  console.log(`\nSuccessfully inserted ${data.length} todos:`);
  for (const todo of data) {
    const status = todo.is_complete ? "✓" : "○";
    console.log(`  ${status} ${todo.title} (${todo.id})`);
  }
}

main();
