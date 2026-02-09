
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/pricing';

async function verifyRoutes() {
    console.log('Verifying Pricing Admin Routes...');

    try {
        // 1. Test Public/User Items Route (Existing)
        console.log('\nTesting Public Items Route GET /items...');
        try {
            const itemsRes = await axios.get(`${BASE_URL}/items`);
            console.log(`✅ Public Items Route: ${itemsRes.status} OK`);
        } catch (error) {
            console.error(`❌ Public Items Route Failed: ${error.response ? error.response.status : error.message}`);
        }

        // 2. Test Public/User Rules Route (Existing)
        console.log('\nTesting Public Rules Route GET /rules...');
        try {
            const rulesRes = await axios.get(`${BASE_URL}/rules`);
            console.log(`✅ Public Rules Route: ${rulesRes.status} OK`);
        } catch (error) {
            console.error(`❌ Public Rules Route Failed: ${error.response ? error.response.status : error.message}`);
        }

        // Note: For actual admin route testing, we'd need a valid token. 
        // 401 Unauthorized is actually a GOOD sign here, meaning the route EXISTS and is protected.
        // 404 Not Found would mean the route is missing (the original error).

        // 3. Test Admin Items Route
        console.log('\nTesting Admin Items Route GET /admin/items...');
        try {
            await axios.get(`${BASE_URL}/admin/items`);
            console.log('❓ Admin Items Route: Unexpected 200 (Should be 401 if no token)');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('✅ Admin Items Route: 401 Unauthorized (Route exists and is protected)');
            } else if (error.response && error.response.status === 404) {
                console.error('❌ Admin Items Route: 404 Not Found (Still missing)');
            } else {
                console.log(`ℹ️ Admin Items Route Response: ${error.response ? error.response.status : error.message}`);
            }
        }

        // 4. Test Admin Rules Route
        console.log('\nTesting Admin Rules Route GET /admin/rules...');
        try {
            await axios.get(`${BASE_URL}/admin/rules`);
            console.log('❓ Admin Rules Route: Unexpected 200 (Should be 401 if no token)');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('✅ Admin Rules Route: 401 Unauthorized (Route exists and is protected)');
            } else if (error.response && error.response.status === 404) {
                console.error('❌ Admin Rules Route: 404 Not Found (Still missing)');
            } else {
                console.log(`ℹ️ Admin Rules Route Response: ${error.response ? error.response.status : error.message}`);
            }
        }

        // 5. Test Admin Features Route
        console.log('\nTesting Admin Features Route GET /admin/features...');
        try {
            await axios.get(`${BASE_URL}/admin/features`);
            console.log('❓ Admin Features Route: Unexpected 200 (Should be 401 if no token)');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('✅ Admin Features Route: 401 Unauthorized (Route exists and is protected)');
            } else if (error.response && error.response.status === 404) {
                console.error('❌ Admin Features Route: 404 Not Found (Still missing)');
            } else {
                console.log(`ℹ️ Admin Features Route Response: ${error.response ? error.response.status : error.message}`);
            }
        }

        // 6. Test Admin Package Items Route
        console.log('\nTesting Admin Package Items Route GET /admin/package-items/test...');
        try {
            await axios.get(`${BASE_URL}/admin/package-items/test`);
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('✅ Admin Package Items Route: 401 Unauthorized (Route exists and is protected)');
            } else if (error.response && error.response.status === 404) {
                console.error('❌ Admin Package Items Route: 404 Not Found (Still missing)');
            } else {
                console.log(`ℹ️ Admin Package Items Route Response: ${error.response ? error.response.status : error.message}`);
            }
        }

        // 7. Test Admin Package Limits Route
        console.log('\nTesting Admin Package Limits Route GET /admin/package-limits/test...');
        try {
            await axios.get(`${BASE_URL}/admin/package-limits/test`);
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('✅ Admin Package Limits Route: 401 Unauthorized (Route exists and is protected)');
            } else if (error.response && error.response.status === 404) {
                console.error('❌ Admin Package Limits Route: 404 Not Found (Still missing)');
            } else {
                console.log(`ℹ️ Admin Package Limits Route Response: ${error.response ? error.response.status : error.message}`);
            }
        }

    } catch (error) {
        console.error('Verification script error:', error.message);
    }
}

verifyRoutes();
