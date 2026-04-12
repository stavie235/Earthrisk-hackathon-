#!/usr/bin/env node

import { exec } from 'child_process';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import https from 'https';

const API_BASE = "https://localhost:9876/api";

// Create a custom axios instance that ignores self-signed certs
const api = axios.create({
  baseURL: API_BASE,
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false 
  })
});

// Helper to pause script execution
async function pause(message = 'Press Enter to continue...') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(message, ans => {
    rl.close();
    resolve(ans);
  }));
}

// Helper to run CLI commands
async function runCommand(command, description) {
  console.log(`
--- Executing: ${description} ---`);
  console.log(`Command: ${command}`);
  await pause(); // Pause before executing
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
      }
      console.log(`Stdout: 
${stdout}`);
      resolve(stdout);
    });
  });
}

// Helper to format dates as YYYY-MM-DD HH:MM:SS
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Helper to format dates as YYYYMMDD
function formatDateYYYYMMDD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

async function main() {
  const SE_CLI = 'se2519'; // Path to your CLI script

  // Define dynamic values
  const POINT_ID = 1; // Example point ID
  const STATION_ID = 1; // Example station ID for addpoints

  // Generate dynamic timestamps for sessions based on current time
  const now = new Date();
  const S1_start = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
  const E1_end = new Date(S1_start.getTime() + 60 * 60 * 1000); // 1 hour after S1_start
  const S2_start = new Date(E1_end.getTime() + 5 * 60 * 1000); // 5 minutes after E1_end
  const E2_end = new Date(S2_start.getTime() + 60 * 60 * 1000); // 1 hour after S2_start

  const S1_FULL = formatDate(S1_start);
  const E1_FULL = formatDate(E1_end);
  const S2_FULL = formatDate(S2_start);
  const E2_FULL = formatDate(E2_end);

  // YYYYMMDD format for sessions and pointstatus queries
  const S1_DATE = formatDateYYYYMMDD(S1_start);
  const E1_DATE = formatDateYYYYMMDD(E1_end);
  const S2_DATE = formatDateYYYYMMDD(S2_start);
  const E2_DATE = formatDateYYYYMMDD(E2_end);

  // --- Pre-setup: Create CSV for addpoints ---
  const csvContent = `id,name,address,latitude,longitude,outlet_id
${STATION_ID},TestStation,123 Main St,34.0522,-118.2437,${POINT_ID}`;
  const csvFilePath = path.join(process.cwd(), 'temp_points.csv');
  fs.writeFileSync(csvFilePath, csvContent);
  console.log(`Created temporary CSV file: ${csvFilePath}`);
  await pause('Press Enter to continue with setup...');


  // --- Create Test User (assuming it's needed before reserve command) ---
  console.log('\n--- Creating a test user ---');
  try {
    const userData = {
      username: 'testuser',
      password: 'testpassword',
      email: 'test@example.com'
    };
    const res = await api.post('/auth/signup', userData);
    console.log('User creation successful:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response && err.response.data && err.response.data.error === 'User already exists') {
      console.log('Test user already exists, proceeding...');
    } else if (err.response) {
      console.error('User creation failed (API response):', JSON.stringify(err.response.data, null, 2));
    } else if (err.request) {
      console.error('User creation failed (no response):', err.request);
    } else {
      console.error('User creation failed (error):', err.message);
    }
  }
  await pause();

  // --- CLI Script Demonstration Steps ---

  // 1. healthcheck
  await runCommand(`${SE_CLI} healthcheck`, 'Perform healthcheck');

  // 2. resetpoints
  await runCommand(`${SE_CLI} resetpoints`, 'Reset charging station points');

  // 3. addpoints
  await runCommand(`${SE_CLI} addpoints --source ${csvFilePath}`, 'Add charging station points from CSV');

  // Silent updpoint to ensure availability
  console.log(`\n--- Silently ensuring point ${POINT_ID} is available after addpoints ---`);
  await new Promise((resolve, reject) => {
    exec(`${SE_CLI} updpoint --id ${POINT_ID} --status available`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Silent updpoint error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.error(`Silent updpoint stderr: ${stderr}`);
      }
      // console.log(`Silent updpoint stdout: ${stdout}`); // Keep this commented to remain silent
      resolve();
    });
  });

  // 4. healthcheck (again)
  await runCommand(`${SE_CLI} healthcheck`, 'Perform healthcheck again');

  // 5. points --status available
  await runCommand(`${SE_CLI} points --status available`, 'Get available points');

  // 6. points --status charging
  await runCommand(`${SE_CLI} points --status charging`, 'Get charging points');

  // 7. points --status offline
  await runCommand(`${SE_CLI} points --status offline`, 'Get offline points');

  // 8. point --id X
  await runCommand(`${SE_CLI} point --id ${POINT_ID}`, `Get information for point ${POINT_ID}`);

  // 9. reserve --id X
  await runCommand(`${SE_CLI} reserve --id ${POINT_ID} --minutes 60`, `Reserve point ${POINT_ID}`);

  // 10. points --status reserved
  await runCommand(`${SE_CLI} points --status reserved`, 'Get reserved points');

  // 11. point --id X
  await runCommand(`${SE_CLI} point --id ${POINT_ID}`, `Get information for point ${POINT_ID} (after reserve)`);

  // 12. updpoint --id X --status available
  await runCommand(`${SE_CLI} updpoint --id ${POINT_ID} --status available`, `Unreserve point ${POINT_ID}`);

  // 13. point --id X
  await runCommand(`${SE_CLI} point --id ${POINT_ID}`, `Get information for point ${POINT_ID} (after unreserve)`);

  // 14. reserve --id X (again)
  await runCommand(`${SE_CLI} reserve --id ${POINT_ID} --minutes 60`, `Reserve point ${POINT_ID} again`);

  // 15. points --status reserved (again)
  await runCommand(`${SE_CLI} points --status reserved`, 'Get reserved points again');

  // 16. newsession --id X --starttime S1 --endtime E1 --startsoc 10 --endsoc 30 --totalkwh 15 --kwhprice 0.5 --amount 7.5
  await runCommand(`${SE_CLI} newsession --id ${POINT_ID} --starttime "${S1_FULL}" --endtime "${E1_FULL}" --startsoc 10 --endsoc 30 --totalkwh 15 --kwhprice 0.5 --amount 7.5`, `Record charging session 1 for point ${POINT_ID}`);

  // 17. pointstatus --id X --from S1 --to E1
  await runCommand(`${SE_CLI} pointstatus --id ${POINT_ID} --from ${S1_DATE} --to ${E1_DATE}`, `Get point status for point ${POINT_ID} from ${S1_DATE} to ${E1_DATE}`);

  // 18. point --id X
  await runCommand(`${SE_CLI} point --id ${POINT_ID}`, `Get information for point ${POINT_ID} (after session 1)`);

  // 19. newsession --id X --starttime S2 --endtime E2 --startsoc 50 --endsoc 80 --totalkwh 20 --kwhprice 0.6 --amount 12
  await runCommand(`${SE_CLI} newsession --id ${POINT_ID} --starttime "${S2_FULL}" --endtime "${E2_FULL}" --startsoc 50 --endsoc 80 --totalkwh 20 --kwhprice 0.6 --amount 12`, `Record charging session 2 for point ${POINT_ID}`);

  // 20. sessions --id X --from S1 --to E2
  await runCommand(`${SE_CLI} sessions --id ${POINT_ID} --from ${S1_DATE} --to ${E2_DATE}`, `Get all sessions for point ${POINT_ID} from ${S1_DATE} to ${E2_DATE}`);

  // 21. pointstatus --id X --from S1 --to E2
  await runCommand(`${SE_CLI} pointstatus --id ${POINT_ID} --from ${S1_DATE} --to ${E2_DATE}`, `Get point status for point ${POINT_ID} from ${S1_DATE} to ${E2_DATE} (after session 2)`);

  // --- Cleanup ---
  fs.unlinkSync(csvFilePath);
  console.log(`Cleaned up temporary CSV file: ${csvFilePath}`);

  console.log('\n--- Demonstration Complete ---');
}

main().catch(err => {
  console.error('Demonstration script failed:', err);
  process.exit(1);
});
