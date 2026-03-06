const axios = require('axios');

const API_BASE = 'https://verification-platform-server.vercel.app/api';
const EMAIL = 'zohaibcollabze@gmail.com';
const PASS = 'sN5WZNuBabVk';
const JOB_ID = '0652c1d0-cac9-455b-ac1f-65d489e5d628';

async function test() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_BASE}/auth/login`, { email: EMAIL, password: PASS });
        const token = loginRes.data.data.accessToken || loginRes.data.data.token;

        console.log('Fetching Findings Schema...');
        const schemaRes = await axios.get(`${API_BASE}/inspections/${JOB_ID}/findings-schema`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('SCHEMA DATA:');
        console.log(JSON.stringify(schemaRes.data, null, 2));

    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
}

test();
