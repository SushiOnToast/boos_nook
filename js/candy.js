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
    .from('candy_contributions')
    .select('id, candy_type, name_adj, name_noun, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return { count, latest: data };
}

async function leaveCandy(candyType) {
  const { adj, noun } = getVisitorName();
  const { data, error } = await db
    .from('candy_contributions')
    .insert({
      candy_type: candyType,
      visitor_id: getVisitorId(),
      name_adj: adj,
      name_noun: noun,
    })
    .select('id')
    .single();
  if (error) throw error;
  rememberMyCandy(data.id);
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

// ---- Generated visitor names (must match the SQL lists exactly) ----
const NAME_ADJ = ['sleepy','shy','tiny','midnight','dusty','gentle','curious','moonlit','mellow','sneaky'];
const NAME_NOUN = ['moth','owl','lantern','cat','raven','cloud','bat','pumpkin','spider','sock'];

function rerollVisitorName() {
  const adj = NAME_ADJ[Math.floor(Math.random() * NAME_ADJ.length)];
  const noun = NAME_NOUN[Math.floor(Math.random() * NAME_NOUN.length)];
  try { localStorage.setItem('lh_name', adj + '|' + noun); } catch (e) {}
  return { adj, noun };
}

function getVisitorName() {
  let saved = [];
  try { saved = (localStorage.getItem('lh_name') || '').split('|'); } catch (e) {}
  if (NAME_ADJ.includes(saved[0]) && NAME_NOUN.includes(saved[1])) {
    return { adj: saved[0], noun: saved[1] };
  }
  return rerollVisitorName();
}

// remember which rows are mine, so they can be marked "you"
function getMyCandyIds() {
  try { return JSON.parse(localStorage.getItem('lh_my_candy') || '[]'); } catch (e) { return []; }
}
function rememberMyCandy(id) {
  const ids = getMyCandyIds();
  ids.push(id);
  try { localStorage.setItem('lh_my_candy', JSON.stringify(ids.slice(-100))); } catch (e) {}
}