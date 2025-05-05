// Script kiểm tra trạng thái authentication
console.log('Kiểm tra trạng thái API...');

async function testAuth() {
    // Kiểm tra trạng thái auth
    try {
        console.log('1. Kiểm tra /api/user...');
        const authResponse = await fetch('http://localhost:5000/api/user', {
            credentials: 'include',
        });

        const authStatus = authResponse.status;
        console.log(`   Status: ${authStatus}`);

        if (authResponse.ok) {
            const userData = await authResponse.json();
            console.log('   Đã đăng nhập:', userData);
        } else {
            console.log('   Chưa đăng nhập');
        }

        // Kiểm tra login
        console.log('\n2. Thử đăng nhập với tài khoản test...');
        const loginResponse = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            }),
            credentials: 'include'
        });

        console.log(`   Status: ${loginResponse.status}`);

        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('   Đăng nhập thành công:', loginData);

            // Kiểm tra lại trạng thái sau khi đăng nhập
            console.log('\n3. Kiểm tra lại /api/user sau khi đăng nhập...');
            const checkResponse = await fetch('http://localhost:5000/api/user', {
                credentials: 'include',
            });

            console.log(`   Status: ${checkResponse.status}`);

            if (checkResponse.ok) {
                const checkData = await checkResponse.json();
                console.log('   User data:', checkData);
            } else {
                console.log('   Không lấy được dữ liệu user');
            }
        } else {
            const errorText = await loginResponse.text();
            console.log('   Đăng nhập thất bại:', errorText);
        }
    } catch (error) {
        console.error('Lỗi kiểm tra xác thực:', error);
    }
}

testAuth(); 