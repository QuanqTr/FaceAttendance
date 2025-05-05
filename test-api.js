// Script để kiểm tra API endpoint
const testPorts = [3000, 5000];

async function testPort(port) {
    try {
        console.log(`Kiểm tra API endpoint trên cổng ${port}...`);
        const response = await fetch(`http://localhost:${port}/api/health`);
        console.log(`Cổng ${port} - Status: ${response.status}`);
        if (response.ok) {
            const data = await response.json();
            console.log(`Cổng ${port} - Response:`, data);
            return true;
        } else {
            console.log(`Cổng ${port} - Lỗi: ${response.statusText}`);
            return false;
        }
    } catch (error) {
        console.error(`Cổng ${port} - Lỗi kết nối:`, error.message);
        return false;
    }
}

async function main() {
    console.log("Kiểm tra kết nối đến server...");
    let connected = false;

    for (const port of testPorts) {
        const result = await testPort(port);
        if (result) {
            connected = true;
            console.log(`\nXác nhận server đang chạy trên cổng ${port}!`);
            break;
        }
    }

    if (!connected) {
        console.log("\nKhông thể kết nối đến server trên cổng nào.");
        console.log("Hãy kiểm tra lại xem server có đang chạy không.");
    }
}

main(); 