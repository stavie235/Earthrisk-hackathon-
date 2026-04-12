const db = require('../config/db');

// Token cache
let cachedToken = null;
let tokenExpiry = null;

const AGENTS = [
  {
    id: 'aacdc499-86a4-4486-b02c-335b0a6e08ee',
    name: 'Risk_Explanation_Agent',
    label: 'Risk Explanation',
    description: 'Calculates the EarthRisk score and explains every contributing factor in Greek.',
    color: '#ff7043',
  },
  {
    id: 'fed05384-4974-4aab-a237-3e48c06e1a51',
    name: 'Alerting_Agent',
    label: 'Risk Alerting',
    description: 'Generates real-time alerts when risk scores exceed thresholds.',
    color: '#dc3545',
  },
  {
    id: '4e2d2846-e26d-451f-8e45-381d9a29014c',
    name: 'Data_Interpreter_Agent',
    label: 'Data Interpreter',
    description: 'Interprets raw environmental and building data into readable summaries.',
    color: '#00c2ff',
  },
  {
    id: '37f6d571-5f76-49aa-bb3a-629c8a803694',
    name: 'Decision_Support_Agent',
    label: 'Decision Support',
    description: 'Suggests premium adjustments and mitigation actions for underwriters.',
    color: '#8bc34a',
  },
];

// Exchange MCSP API key for a bearer token
// Source: ibm_watsonx_orchestrate/client/service_instance.py — MCSPAuthenticator URL
async function getMcspToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const apiKey = process.env.WO_API_KEY;
  if (!apiKey) throw new Error('WO_API_KEY is not set in .env');

  console.log('[Agent] Fetching MCSP token...');
  const res = await fetch('https://iam.platform.saas.ibm.com/siusermgr/api/1.0/apikeys/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: apiKey }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Agent] Token fetch failed (${res.status}): ${text}`);
    // Try MCSP V2 endpoint as fallback
    console.log('[Agent] Trying MCSP V2 token endpoint...');
    const res2 = await fetch('https://account-iam.platform.saas.ibm.com/siusermgr/api/1.0/apikeys/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apikey: apiKey }),
    });
    if (!res2.ok) {
      const text2 = await res2.text();
      throw new Error(`MCSP token exchange failed on both V1 and V2. V1: ${res.status}, V2: ${res2.status} — ${text2}`);
    }
    const data2 = await res2.json();
    cachedToken = (data2.token || '').replace(/^Bearer\s+/, '');
    tokenExpiry = Date.now() + 50 * 60 * 1000;
    return cachedToken;
  }

  const data = await res.json();
  console.log('[Agent] Token response keys:', Object.keys(data));
  // token may come as "Bearer eyJ..." or just "eyJ..."
  cachedToken = (data.token || '').replace(/^Bearer\s+/, '');
  tokenExpiry = Date.now() + 50 * 60 * 1000;
  return cachedToken;
}

// Poll run status until completed or failed (max 120 seconds)
async function pollRunStatus(instanceUrl, runId, token) {
  const MAX_ATTEMPTS = 60;
  const INTERVAL_MS = 2000;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await new Promise(r => setTimeout(r, INTERVAL_MS));

    const res = await fetch(`${instanceUrl}/runs/${runId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Polling run status failed (${res.status}): ${text}`);
    }

    const status = await res.json();
    const state = (status.status || '').toLowerCase();

    if (state === 'completed') return status;
    if (state === 'failed') throw new Error(`Agent run failed: ${status.error || 'unknown error'}`);
  }

  throw new Error('Agent run timed out after 120 seconds');
}

// Extract reply text from the thread messages
async function getThreadReply(instanceUrl, threadId, token) {
  const res = await fetch(`${instanceUrl}/threads/${threadId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch thread messages (${res.status}): ${text}`);
  }

  const data = await res.json();

  // Messages array — find the last assistant message
  const messages = Array.isArray(data) ? data : (data.messages || data.data || []);
  const assistantMsgs = messages.filter(m => m.role === 'assistant');

  if (assistantMsgs.length === 0) {
    // Fallback: try to get content from run status result
    return null;
  }

  const last = assistantMsgs[assistantMsgs.length - 1];
  const content = last.content;

  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(c => c.text || c.content || '').join('\n');
  }
  return JSON.stringify(content);
}

// Fetch a building from the DB matching an ID or keywords in the message,
// then prepend its fields as structured context so the agent never has to ask the user.
async function enrichWithBuildingData(message) {
  let building = null;

  // Try to match BLD_XXXX pattern
  const idMatch = message.match(/\bBLD_(\d+)\b/i);
  if (idMatch) {
    const [rows] = await db.query(
      'SELECT * FROM Building WHERE external_id = ? LIMIT 1',
      [idMatch[0].toUpperCase()]
    );
    building = rows[0] || null;
  }

  // Fallback: search by prefecture, building name, or address (first 80 chars of message)
  if (!building) {
    const snippet = message.slice(0, 80).replace(/[%_]/g, '');
    const [rows] = await db.query(
      `SELECT * FROM Building
       WHERE building_name LIKE ? OR address LIKE ? OR prefecture LIKE ?
       LIMIT 1`,
      [`%${snippet}%`, `%${snippet}%`, `%${snippet}%`]
    );
    building = rows[0] || null;
  }

  if (!building) return message; // no match — send message unchanged

  const currentYear = new Date().getFullYear();
  const age = currentYear - (building.year_built || currentYear);

  const context = `
[ΔΕΔΟΜΕΝΑ ΚΤΙΡΙΟΥ ΑΠΟ ΤΗ ΒΑΣΗ ΔΕΔΟΜΕΝΩΝ — χρησιμοποίησε αυτά για να καλέσεις το εργαλείο]
external_id: ${building.external_id}
region_name: ${building.prefecture}
address: ${building.address}
construction_material: ${building.construction_material}
year_built: ${building.year_built}  (building_age: ${age} years)
earthquake_zone: ${building.earthquake_zone}
flood_zone: ${building.flood_zone}
fire_risk: ${building.fire_risk}
near_nature: ${building.near_nature ? 'true' : 'false'}
nasa_avg_temp_c: ${building.nasa_avg_temp_c}
crime_rate: ${building.crime_rate}
risk_score: ${building.risk_score}
risk_category: ${building.risk_category}
annual_premium_euro: ${building.annual_premium_euro}
actual_value_euro: ${building.actual_value_euro}
declared_value_euro: ${building.declared_value_euro}
underinsured: ${building.underinsured ? 'true' : 'false'}

Καλεί το εργαλείο interpret_building_data χρησιμοποιώντας ΜΟΝΟ τα παραπάνω δεδομένα. ΜΗΝ ζητάς επιπλέον τιμές από τον χρήστη.

[ΕΡΩΤΗΜΑ ΧΡΗΣΤΗ]
${message}
`.trim();

  return context;
}

const listAgents = (req, res) => {
  res.json(AGENTS.filter(a => a.id !== null));
};

const chat = async (req, res, next) => {
  const { agentId } = req.body;
  let { message } = req.body;

  if (!agentId || !message) {
    res.status(400);
    return next(new Error('agentId and message are required'));
  }

  const agent = AGENTS.find(a => a.id === agentId);
  if (!agent) {
    res.status(400);
    return next(new Error('Unknown agent ID'));
  }

  try {
    console.log(`[Agent] Chat request — agent: ${agent.name}`);

    // For data-driven agents, enrich the message with real DB building data
    if (agent.name === 'Data_Interpreter_Agent' || agent.name === 'Decision_Support_Agent') {
      message = await enrichWithBuildingData(message);
      console.log(`[Agent] Enriched message (first 200): ${message.slice(0, 200)}`);
    }

    const token = await getMcspToken();
    console.log(`[Agent] Token obtained (first 10 chars): ${token.slice(0, 10)}...`);

    const instanceUrl = process.env.WO_INSTANCE;
    console.log(`[Agent] Instance URL: ${instanceUrl}`);

    // Step 1 — Create a run
    // BaseWXOClient appends /v1/orchestrate to instance URL for cloud instances
    const apiBase = `${instanceUrl}/v1/orchestrate`;
    console.log(`[Agent] Step 1: Creating run at ${apiBase}/runs`);
    const runRes = await fetch(`${apiBase}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: { role: 'user', content: message },
        agent_id: agentId,
        capture_logs: false,
      }),
    });

    const runText = await runRes.text();
    console.log(`[Agent] Step 1 response (${runRes.status}): ${runText.slice(0, 300)}`);

    if (!runRes.ok) {
      throw new Error(`Failed to create run (${runRes.status}): ${runText}`);
    }

    const runData = JSON.parse(runText);
    const runId = runData.run_id;
    const threadId = runData.thread_id;
    console.log(`[Agent] run_id: ${runId} | thread_id: ${threadId}`);

    if (!runId) throw new Error(`No run_id in response: ${JSON.stringify(runData)}`);

    // Step 2 — Poll until run completes
    console.log(`[Agent] Step 2: Polling run status...`);
    await pollRunStatus(apiBase, runId, token);
    console.log(`[Agent] Step 2: Run completed`);

    // Step 3 — Fetch thread messages
    console.log(`[Agent] Step 3: Fetching thread messages`);
    let reply = await getThreadReply(apiBase, threadId, token);
    console.log(`[Agent] Step 3: Reply (first 100): ${(reply || '').slice(0, 100)}`);

    if (!reply) {
      reply = 'The agent completed the run but returned no text.';
    }

    res.json({ reply, agent: agent.label });
  } catch (err) {
    console.error(`[Agent] ERROR: ${err.message}`);
    next(err);
  }
};

module.exports = { listAgents, chat };
