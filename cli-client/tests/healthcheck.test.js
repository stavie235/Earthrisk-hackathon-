import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Helper function to run the CLI command
const runCli = (command) => {
  const cliPath = './index.js'; // Path to the CLI entry point
  return execPromise(`node ${cliPath} ${command}`, { env: process.env });
};

describe('CLI healthcheck command', () => {
  it('should return a status of OK from the API', async () => {
    // Ensure the server is running in test mode before this test is run
    const { stdout, stderr } = await runCli('healthcheck');

    expect(stderr).toBe('');

    const data = JSON.parse(stdout);
    // Check for the presence of each key-value pair or key, since console.log's object formatting can vary.
    expect(data.status).toBe('OK');
    expect(data).toHaveProperty('dbconnection');
	  expect(typeof data.dbconnection).toBe('string');
    expect(data).toHaveProperty('n_charge_points');
	  expect(typeof data.n_charge_points).toBe('number');
	  expect(data.n_charge_points).toBeGreaterThan(0);
    expect(data).toHaveProperty('n_charge_points_online');
	  expect(typeof data.n_charge_points_online).toBe('number');
          expect(data.n_charge_points_online).toBeGreaterThan(0);
    expect(data).toHaveProperty('n_charge_points_offline');
	  expect(typeof data.n_charge_points_offline).toBe('number');
          expect(data.n_charge_points_offline).toBeGreaterThan(0);
	  expect(data.n_charge_points_offline + data.n_charge_points_online).toBe(data.n_charge_points);
  });
});
