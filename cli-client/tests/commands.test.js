import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execPromise = promisify(exec);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const registerTestUser = async () => {
  try {
    const response = await fetch('https://localhost:9876/api/auth/signup', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: "testuser",
        password: "password123",
        email: "test@example.com"
      })
    });

    // If it fails (and it's not just "user already exists"), throw error
    if (!response.ok && response.status !== 400) {
        const txt = await response.text();
        throw new Error(`Failed to register user: ${response.status} ${txt}`);
    }
  } catch (error) {
    // Log the 'cause' to see underlying network errors (ECONNREFUSED, etc.)
    console.error("User registration failed:", error.message);
    if (error.cause) console.error("Cause:", error.cause); 
  }
};

// Helper function to run the CLI command
const runCli = (command) => {
  const cliPath = './index.js'; // Path to the CLI entry point
  return execPromise(`node --no-warnings ${cliPath} ${command}`, { env: process.env });
};

describe('CLI Commands', () => {

    beforeAll(async () => {
      await registerTestUser();
  });


  // Before each test, reset the database to a known state.
  beforeEach(async () => {
    const { stdout, stderr } = await runCli('resetpoints');
    expect(stderr).toBe('');
    expect(stdout).toContain('Data reset to initial state successfully.');
    

  });


  // --- se2519 points ---
  describe('points command', () => {
    it('should return a list of all points in CSV format', async () => {
      const { stdout, stderr } = await runCli('points'); // No status filter
      expect(stderr).toBe('');
      // Check for CSV header and a known point from reset_data.json
      expect(stdout).toContain('providerName,pointid,lon,lat,status,cap');
      expect(stdout).toContain('4704813'); // This should always be present now
    });

    it('should return a list of points filtered by status in CSV format', async () => {
      const { stdout, stderr } = await runCli('points --status available');
      expect(stderr).toBe('');
      // Check for CSV header
      expect(stdout).toContain('providerName,pointid,lon,lat,status,cap');
      
      const lines = stdout.trim().split('\n');
      const header = lines.shift(); // Remove header line
      expect(lines.length).toBeGreaterThan(0); // Ensure there are data rows

      // Verify each row has the correct status
      lines.forEach(line => {
        const columns = line.split(',');
        const statusColumnIndex = header.split(',').indexOf('status');
        expect(columns[statusColumnIndex]).toBe('available');
      });
    });

    it('should return a list of points in JSON format when requested', async () => {
        const { stdout, stderr } = await runCli('points --format json');
        expect(stderr).toBe('');
        const data = JSON.parse(stdout);
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
        // Check for a known point from reset_data.json
        const point = data.find(p => p.pointid === 4704813);
        expect(point).toBeDefined();
    });
  });

  // --- se2519 point --id <id> ---
  describe('point command', () => {

it('should return details for a specific point', async () => {
  
  const pointId = 4704813; // Charger ID from first record in reset_data.json
  const { stdout, stderr } = await runCli(`point --id ${pointId}`);

  expect(stderr).toBe('');

  const result = JSON.parse(stdout);
expect(result).toHaveProperty('pointid', pointId);
  expect(typeof result.lon).toBe('string');
  expect(typeof result.lat).toBe('string');
  expect(typeof result.cap).toBe('number');
  expect(typeof result.reservationendtime).toBe('string');
  expect(typeof result.status).toBe('string');

  // kwhprice can be number or null
  expect(
    result.kwhprice === null || typeof result.kwhprice === 'number'
  ).toBe(true);
});

it('should return error log for a non-existent point', async () => {
        const { stdout, stderr } = await runCli('point --id 9999999');
        
    

        expect(stderr).toContain('Point with ID 9999999 not found');
        expect(stderr).toContain('404');
    });
});

  // --- se2519 addpoints --source <file> ---
  describe('addpoints command', () => {
    const testCsvPath = path.join(__dirname, 'temp_points.csv');

    afterAll(async () => {
      // Clean up the temporary file after all tests in this suite are done
      try {
        await fs.unlink(testCsvPath);
      } catch (error) {
        // Ignore errors if the file doesn't exist
      }
    });

    it('should add points from a valid CSV file', async () => {
      const csvContent = 'id,name,address,latitude,longitude,outlet_id\n999,Test Add Station,456 Test Ave,38,-24,99901';
      await fs.writeFile(testCsvPath, csvContent);
      
      const { stdout, stderr } = await runCli(`addpoints --source "${testCsvPath}"`);
      expect(stderr).toBe('');
      expect(stdout).toContain('Upload successful');
      expect(stdout).toContain('Successfully imported 1 stations.');

      // Verify the point was actually added
      const { stdout: pointOut, stderr: pointErr } = await runCli('point --id 99901');
        expect(pointErr).toBe('');
	    // Parse the JSON output
  const result = JSON.parse(pointOut);

  // Check the pointid
  expect(result.pointid).toBe(99901);

  // Optional: check the shape of other fields
  expect(typeof result.lon).toBe('string');
  expect(typeof result.lat).toBe('string');
  expect(typeof result.status).toBe('string');
  expect(typeof result.cap).toBe('number');
  expect(typeof result.reservationendtime).toBe('string');

  // kwhprice can be number or null
  expect(result.kwhprice === null || typeof result.kwhprice === 'number').toBe(true);
    });
  });


//reserve
 describe('reserve command', () => {
    it('should reserve a point for 5 minutes', async () => {
      const pointId = 4704813;

      // Force status to 'available' first to ensure test stability
	    
	const now = new Date();
      await runCli(`updpoint --id ${pointId} --status available`);

      const { stdout, stderr } = await runCli(`reserve --id ${pointId} --minutes 5`);
      expect(stderr).toBe('');
     	const output = JSON.parse(stdout);

	expect(output.pointid).toBe(String(pointId));
	expect(output.status).toBe('reserved');
	expect(output).toHaveProperty('reservationendtime');

	const reservationEndTime = new Date(output.reservationendtime.replace(' ', 'T'));
	const diffMinutes = (reservationEndTime - now) / (1000 * 60);
	expect(diffMinutes).toBeGreaterThanOrEqual(4);
	expect(diffMinutes).toBeLessThanOrEqual(6);

    });

    it('should fail to reserve a point that is not available', async () => {
        // First, set the point to a non-available status
        await runCli('updpoint --id 4704813 --status charging');
        
        const { stdout, stderr } = await runCli('reserve --id 4704813 --minutes 5');
        
        const output = JSON.parse(stderr);

  expect(output).toMatchObject({
    call: '/api/reserve/4704813/5',
    return_code: 404,
    error: 'Point with ID 4704813 is not available for reservation',
    debuginfo: null
  });

  // Optional: explicitly assert dynamic fields exist
  expect(output.timeref).toBeDefined();
  expect(output.originator).toBeDefined();
    });
  });

  // --- se2519 updpoint --id <id> ---
  describe('updpoint command', () => {
    const pointId = 4704813;

    it('should update both status and price of a point', async () => {
        const newStatus = 'available';
        const newPrice = '0.99';
        const { stdout, stderr } = await runCli(`updpoint --id ${pointId} --status ${newStatus} --price ${newPrice}`);
        expect(stderr).toBe('');
        
        expect(stdout).toContain('pointid', String(pointId));
        expect(stdout).toContain('status', newStatus);
        expect(stdout).toContain('kwhprice', parseFloat(newPrice));
    });

    it('should return an error if no update fields are provided', async () => {
        const { stdout, stderr } = await runCli(`updpoint --id ${pointId}`);
        expect(stdout).toBe('');
        expect(stderr).toContain('At least one of the fields status, price must be given');
    });
  });

  // --- se2519 newsession --id <id> ---
  describe('newsession command', () => {
    it('should create a new session for a point', async () => {
        const pointId = 4704813;
        const starttime = '2025-12-01 10:00';
        const endtime = '2025-12-01 11:00';
        const startsoc = 10;
        const endsoc = 90;
        const totalkwh = 20;
        const kwhprice = 0.50;
        const amount = 10;

        await runCli(`updpoint --id ${pointId} --status available --price 0.99`);
  
        const { stdout, stderr } = await runCli(`newsession --id ${pointId} --starttime "${starttime}" --endtime "${endtime}" --startsoc ${startsoc} --endsoc ${endsoc} --totalkwh ${totalkwh} --kwhprice ${kwhprice} --amount ${amount}`);
        
        expect(stderr).toBe('');
        expect(stdout).toContain('');
    });

    it('should return an error for invalid session data', async () => {
        const pointId = 4704813;
        const startsoc = 10;
        const endsoc = 90;
        const totalkwh = 20;
        const kwhprice = 0.50;
        const amount = 10;
        const { stdout, stderr } = await runCli(`newsession --id ${pointId} --starttime "2025-12-01 10:00" --endtime "2025-12-01 9:00" --startsoc ${startsoc} --endsoc ${endsoc} --totalkwh ${totalkwh} --kwhprice ${kwhprice} --amount ${amount}`);
        expect(stdout).toBe('');

const output = JSON.parse(stderr);

  expect(output).toMatchObject({
    call: '/api/newsession',
    return_code: 400,
    error: 'endtime not valid timestamp',
    debuginfo: null
  });

  // Optional: explicitly assert dynamic fields exist
  expect(output.timeref).toBeDefined();
  expect(output.originator).toBeDefined();

    });
  });
  
  // --- se2519 sessions --id <id> --from <from> --to <to> ---
  describe('sessions command', () => {
    const pointId = 4704813;
    const from = '20251101';
    const to = '20251130';

    // CHANGE: Use beforeEach, not beforeAll
    beforeEach(async () => {
        // 1. Ensure point is available
        await runCli(`updpoint --id ${pointId} --status available --price 0.99`);
        
        // 2. Add seconds (:00) to ensure SQL accepts the time strictly
        const starttime = '2025-11-10 10:00';
        const endtime = '2025-11-10 11:00';
        
        // 3. Create the session
        const { stdout, stderr } = await runCli(`newsession --id ${pointId} --starttime "${starttime}" --endtime "${endtime}" --startsoc 20 --endsoc 80 --totalkwh 30 --kwhprice 0.30 --amount 9.00`);
        
        // 4. Check for errors
        if (stderr) {
            console.error('Setup Failure Log:', stderr);
            throw new Error(`Newsession setup failed: ${stderr}`);
        }
    });

    it('should retrieve sessions for a point in JSON format', async () => {
        const { stdout, stderr } = await runCli(`sessions --id ${pointId} --from ${from} --to ${to} --format json`);
        expect(stderr).toBe('');
        
        // Now this should pass because the session exists!
        expect(stdout).toContain('totalkwh');
    });

        it('should return an error for invalid date format', async () => {

        const { stdout, stderr } = await runCli(`sessions --id ${pointId} --from 2025-11-01 --to 2025-11-30`);

        expect(stdout).toBe('');

const output = JSON.parse(stderr);

  expect(output).toMatchObject({
    call: '/api/sessions/4704813/2025-11-01/2025-11-30',
    return_code: 400,
    error: 'from date must be integer',
    debuginfo: null
  });

  // Optional: explicitly assert dynamic fields exist
  expect(output.timeref).toBeDefined();
  expect(output.originator).toBeDefined();

    });



    it('should return no content when no sessions are found', async () => {

        const { stdout, stderr } = await runCli(`sessions --id ${pointId} --from 20240101 --to 20241231`);

        expect(stdout).toBe('');

        expect(stderr).toBe('');

      });


  });
  // --- se2519 pointstatus --id <id> --from <from> --to <to> ---
  describe('pointstatus command', () => {
    const pointId = 4704813;

    it('should retrieve status changes for a point', async () => {
        await runCli(`updpoint --id ${pointId} --status malfunction`);
        await runCli(`updpoint --id ${pointId} --status available`);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const { stdout, stderr } = await runCli(`pointstatus --id ${pointId} --from ${today} --to ${today} --format json`);

        expect(stderr).toBe('');
        expect(stdout).toContain('timeref');
        expect(stdout).toContain('old_state');
        expect(stdout).toContain('new_state');
        
    });

    it('should return no content when no status changes are found', async () => {
      const { stdout, stderr } = await runCli(`pointstatus --id ${pointId} --from 20240101 --to 20240131`);
      expect(stdout).toBe('');
      expect(stderr).toBe('');
    });
  });
});
