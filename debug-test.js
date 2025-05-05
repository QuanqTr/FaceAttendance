// Script kiểm tra lỗi hệ thống
console.log('====== KIỂM TRA HỆ THỐNG ======');

// 1. Kiểm tra API /api/departments
async function testDepartmentsAPI() {
    console.log('1. Kiểm tra API /api/departments');
    try {
        const response = await fetch('http://localhost:5000/api/departments');
        console.log('Status code:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('Kết quả thành công:', data.length, 'phòng ban');
        } else {
            const text = await response.text();
            console.log('Lỗi:', response.status, text);
        }
    } catch (error) {
        console.error('Lỗi kết nối API:', error.message);
    }
}

// 2. Kiểm tra khả năng truy cập camera
async function testCameraAccess() {
    console.log('\n2. Kiểm tra khả năng truy cập camera');
    try {
        console.log('Đang liệt kê thiết bị camera...');
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        console.log(`Tìm thấy ${cameras.length} camera:`, cameras);

        if (cameras.length > 0) {
            console.log('Thử truy cập camera đầu tiên...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: cameras[0].deviceId
                }
            });
            console.log('Truy cập camera thành công!');
            console.log('Thông tin track:', stream.getVideoTracks()[0].label);

            // Ngắt kết nối
            stream.getTracks().forEach(track => track.stop());
        } else {
            console.log('Không tìm thấy camera nào!');
        }
    } catch (error) {
        console.error('Lỗi truy cập camera:', error.name, error.message);
    }
}

// Chạy các bài kiểm tra
async function runTests() {
    await testDepartmentsAPI();

    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        await testCameraAccess();
    } else {
        console.log('\n2. Không thể kiểm tra camera trong môi trường này');
    }

    console.log('\n======= KẾT THÚC KIỂM TRA =======');
}

runTests(); 