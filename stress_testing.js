const axios = require('axios');
const nodemailer = require('nodemailer');
const fs = require('fs');

const url = 'https://liamcrest.com/'; // Change this to your desired URL
const totalRequests = 1000;

async function sendRequests(numRequests, parallelRequests) {
    const successfulRequests = [];
    const unsuccessfulRequests = [];

    const startTime = new Date();

    await Promise.all(Array(parallelRequests).fill().map(async () => {
        for (let i = 0; i < numRequests / parallelRequests; i++) {
            try {
                const response = await axios.get(url);
                successfulRequests.push(response.status);
            } catch (error) {
                unsuccessfulRequests.push(error.response ? error.response.status : 'Unknown');
            }
        }
    }));

    const endTime = new Date();
    const totalTime = (endTime - startTime) / (1000 * 60); // in minutes

    return {
        successful: successfulRequests.length,
        unsuccessful: unsuccessfulRequests.length,
        totalTime
    };
}

async function runTests() {
    const results = [];
    
    // Create a new 200_successful_requests.csv file if it doesn't exist
    if (!fs.existsSync('200_successful_requests.csv')) {
        fs.writeFileSync('200_successful_requests.csv', `${url},0,0,0`);
    }

    // Import data from 200 successful requests CSV file
    const data200 = fs.readFileSync('200_successful_requests.csv', 'utf8');
    const [url200, successful200, _, totalTime200] = data200.split(',');
    results.push({
        url: url200,
        successful: parseInt(successful200),
        unsuccessful: 0,
        totalTime: parseFloat(totalTime200)
    });

    const parallelRequestsList = [20, 40, 60, 80, 100];
    
    for (const parallelRequests of parallelRequestsList) {
        const result = await sendRequests(totalRequests, parallelRequests);
        const successStatusCodes = result.successful; // Count of successful requests
        const errorStatusCodes = result.unsuccessful; // Count of unsuccessful requests

        // Use different status codes for successful and unsuccessful requests
        results.push({
            url,
            successful: successStatusCodes, // Use successStatusCodes for successful requests
            unsuccessful: errorStatusCodes, // Use errorStatusCodes for unsuccessful requests
            totalTime: result.totalTime
        });
    }

    // Write results to CSV file
    const csvData = results.map(result => `${result.url},${result.successful},${result.unsuccessful},${result.totalTime}`).join('\n');
    fs.writeFileSync('combined_stress_test_results.csv', 'URL,Successful Requests,Unsuccessful Requests,Total Time (minutes)\n' + csvData);

    // Mail the CSV file
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'your-email@gmail.com', // Change this to your Gmail address
            pass: 'your-password' // Change this to your Gmail password
        }
    });

    const mailOptions = {
        from: 'your-email@gmail.com',
        to: 'khawarhayat1997@gmail.com',
        subject: 'Combined Stress Test Results',
        text: 'Please find attached the combined stress test results CSV file.',
        attachments: [{
            filename: 'combined_stress_test_results.csv',
            path: 'combined_stress_test_results.csv'
        }]
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}

runTests();
