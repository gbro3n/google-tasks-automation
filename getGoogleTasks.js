const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Ensure .env file read from same directory as the script

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// .env file format

// CLIENT_ID=<CLIENT_ID>
// CLIENT_SECRET=<CLIENT_SECRET>
// REFRESH_TOKEN=<REFRESH_TOKEN>
// TASK_LIST_NAME=Journal
// FILE_PATH=<PATH_ROOT>\notes-general\pages\Google Journal.md

// See https://console.cloud.google.com/apis/credentials?project=personal-356019

// Load environment variables

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const TASK_LIST_NAME = process.env.TASK_LIST_NAME;
const FILE_PATH = process.env.FILE_PATH || 'tasks.md'; // Default to 'tasks.md' if FILE_PATH is not set

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const googleTasks = google.tasks({ version: 'v1', auth: oauth2Client });

async function findTaskListByName(taskListName) {
    try {
        const response = await googleTasks.tasklists.list({});
        const taskLists = response.data.items;

        if (!taskLists) {
            console.log('No task lists found.');
            return null;
        } else {
            console.log('Task lists:');
            taskLists.forEach((taskList) => {
                // {
                //     kind: 'tasks#taskList',
                //     id: 'Y0Y1eV9nUDlhRVVYSGhoRg',
                //     etag: '"LTE1NzAzMDUwNzk"',
                //     title: 'Today',
                //     updated: '2024-07-11T15:26:20.218Z',
                //     selfLink: 'https://www.googleapis.com/tasks/v1/users/@me/lists/Y0Y1eV9nUDlhRVVYSGhoRg'
                // }

                console.log('taskList', taskList);
            });
        }

        const taskList = taskLists.find((tl) => tl.title === taskListName);
        return taskList ? taskList : null;
    } catch (error) {
        console.error('The API returned an error: ' + error);
        return null;
    }
}

async function listAndDeleteTasks() {
    try {
        const taskListName = TASK_LIST_NAME; // Replace with the name of your task list
        const taskList = await findTaskListByName(taskListName);

        const { data } = await googleTasks.tasks.list({
            tasklist: taskList.id, // Replace with your specific task list ID or @default
        });

        const taskItems = data.items;
        if (!taskItems) {
            console.log('No tasks found.');
            return;
        }

        let markdownContent = '';
        taskItems.forEach((task, index) => {
            console.log('task', task);

            markdownContent += `- NOW ${task.title}\n`;
        });

        // Write to Markdown file
        fs.writeFileSync(FILE_PATH, markdownContent);
        console.log('Tasks written to tasks.md in Markdown format.');

        // The issue is that the only scope being offered is ""scope": "https://www.googleapis.com/auth/tasks.readonly" despite being configured with "https://www.googleapis.com/auth/tasks"
        // This may be because the app is in test mode https://chatgpt.com/c/151b8d61-d346-4fbc-9f27-5e4d5334d50d

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
