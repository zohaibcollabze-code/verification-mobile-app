const axios = require('axios');

async function test() {
    try {
        const loginRes = await axios.post('https://verification-platform-server.vercel.app/api/auth/login', {
            email: 'zohaibcollabze@gmail.com',
            password: 'sN5WZNuBabVk'
        });

        console.log('--- LOGIN RESPONSE ---');
        console.log(JSON.stringify(loginRes.data, null, 2));

        const token = loginRes.data.data?.accessToken || loginRes.data.data?.token;
        if (!token) {
            console.log('No token found in response');
            return;
        }

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        const requestsRes = await axios.get('https://verification-platform-server.vercel.app/api/requests', config);
        console.log('\n--- REQUESTS LIST ---');
        console.log(JSON.stringify(requestsRes.data, null, 2));

        if (requestsRes.data.data && requestsRes.data.data.length > 0) {
            const firstId = requestsRes.data.data[0].request_id || requestsRes.data.data[0].id;
            const detailRes = await axios.get(`https://verification-platform-server.vercel.app/api/requests/${firstId}`, config);
            console.log('\n--- REQUEST DETAIL ---');
            console.log(JSON.stringify(detailRes.data, null, 2));
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

test();
