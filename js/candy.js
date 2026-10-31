const SUPABASE_URL = "https://arbugvotqxjwxjkrsnlu.supabase.co";
const SUPABASE_KEY = "sb_publishable_IUQOI1oIwMecuxrd_QImsg_fiTGAXPX";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function getVisitorId() {
  let id = localStorage.getItem("lh_visitor");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("lh_visitor", id);
  }
  return id;
}

async function loadBasket(limit = 50) {
  const { data, error, count } = await db
    .from("candy_contributions")
    .select("candy_type, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return { count, latest: data };
}

async function leaveCandy(candyType) {
  const { error } = await db
    .from("candy_contributions")
    .insert({ candy_type: candyType, visitor_id: getVisitorId() });
  if (error) throw error;
}

// Calls onNew(row) whenever anyone leaves candy
function subscribeToCandy(onNew) {
  return db
    .channel("candy")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "candy_contributions" },
      (payload) => onNew(payload.new),
    )
    .subscribe();
}

// utility to nicely display last time someone left sweet
function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
}
