const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

async function testManagerPasswordChange() {
    console.log('🔐 Testing Manager Password Change...');

    // First login as manager
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'quang', // Manager username 
            password: '123456'
        })
    });

    if (!loginRes.ok) {
        console.log('❌ Login failed:', await loginRes.text());
        return;
    }

    const loginData = await loginRes.json();
    console.log('✅ Login successful:', loginData.user.role);

    const cookies = loginRes.headers.get('set-cookie');

    // Test password change
    const changePasswordRes = await fetch(`${BASE_URL}/api/manager/change-password`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies
        },
        body: JSON.stringify({
            currentPassword: '123456',
            newPassword: '123456' // Same password for test
        })
    });

    if (!changePasswordRes.ok) {
        const errorData = await changePasswordRes.json();
        console.log('❌ Password change failed:', errorData);
    } else {
        const data = await changePasswordRes.json();
        console.log('✅ Password change successful:', data);
    }
}

async function testUserFaceProfile() {
    console.log('👤 Testing User Face Profile...');

    // Login as user
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'nhung', // User username
            password: '123456'
        })
    });

    if (!loginRes.ok) {
        console.log('❌ User login failed:', await loginRes.text());
        return;
    }

    const loginData = await loginRes.json();
    console.log('✅ User login successful:', loginData.user);

    const cookies = loginRes.headers.get('set-cookie');
    const userId = loginData.user.id;

    // Test face profile update
    const faceDescriptor = Array.from({ length: 128 }, () => Math.random());

    const updateFaceRes = await fetch(`${BASE_URL}/api/users/${userId}/face-profile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies
        },
        body: JSON.stringify({
            faceDescriptor: faceDescriptor
        })
    });

    if (!updateFaceRes.ok) {
        const errorData = await updateFaceRes.json();
        console.log('❌ Face profile update failed:', errorData);
    } else {
        const data = await updateFaceRes.json();
        console.log('✅ Face profile update successful:', data);
    }
}

async function main() {
    console.log('🚀 Starting API Tests...\n');

    await testManagerPasswordChange();
    console.log('\n' + '='.repeat(50) + '\n');
    await testUserFaceProfile();

    console.log('\n✨ Tests completed!');
}

main().catch(console.error); 