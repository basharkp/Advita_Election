const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testFlow() {
    try {
        console.log("1. Checking Status...");
        const statusRes = await axios.get(`${API_URL}/election`);
        console.log("Current Status:", statusRes.data);

        console.log("2. Logging in...");
        // Assuming default admin exists or was created (user didn't give me seed info, but I'll try generic)
        // If login fails, I can't test update.
        // Wait, I don't know the admin credentials.
        // I can skip login testing and try to hit the update endpoint with a FAKE token to ensure it returns 403, not 500 or timeout.

        console.log("3. Attempting Update with BAD token...");
        try {
            await axios.put(`${API_URL}/election`, { status: 'RUNNING' }, {
                headers: { Authorization: 'Bearer invalid_token' }
            });
        } catch (e) {
            console.log("Update failed as expected:", e.response ? e.response.status : e.message);
            if (e.response && e.response.status === 403) {
                console.log("PASS: Server correctly rejected invalid token.");
            } else {
                console.log("FAIL: Server behavior unexpected.");
            }
        }

    } catch (e) {
        console.error("Test Error:", e.message);
        if (e.response) console.error("Response:", e.response.data);
    }
}

testFlow();
