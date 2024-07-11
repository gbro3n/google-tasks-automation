const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

// See https://console.cloud.google.com/apis/credentials?project=personal-356019

// Load environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const googleTasks = google.tasks({ version: 'v1', auth: oauth2Client });

async function listAndDeleteTasks() {
    try {
        const { data } = await googleTasks.tasks.list({
            tasklist: '@default', // Replace with your specific task list ID
        });

        const taskItems = data.items;
        if (!taskItems) {
            console.log('No tasks found.');
            return;
        }

        let markdownContent = '# Google Tasks\n\n';
        taskItems.forEach((task, index) => {
            markdownContent += `## ${index + 1}. ${task.title}\n`;
            markdownContent += `- Due: ${task.due || 'No due date'}\n`;
            markdownContent += `- Status: ${task.status}\n\n`;
        });

        // Write to Markdown file
        fs.writeFileSync('tasks.md', markdownContent);
        console.log('Tasks written to tasks.md in Markdown format.');

        // The issue is that the only scope being offered is ""scope": "https://www.googleapis.com/auth/tasks.readonly" despite being configured with "https://www.googleapis.com/auth/tasks" - is this because the app is in test mode?

        // Delete tasks after writing to file
        // for (const task of taskItems) {
        //     await googleTasks.tasks.delete({
        //         tasklist: '@default', // Use the same tasklist ID as above
        //         task: task.id,
        //     });
        //     console.log(`Deleted task: ${task.title}`);
        // }
    } catch (error) {
        console.error('The API returned an error: ' + error);
    }
}

listAndDeleteTasks();
