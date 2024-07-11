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

// Function to find a task list by name
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

        return taskLists.find((tl) => tl.title === taskListName) || null;
    } catch (error) {
        console.error('The API returned an error: ' + error);
        return null;
    }
}

// Function to append tasks that do not exist in the file
async function listAndAppendTasks() {
    try {
        const taskList = await findTaskListByName(TASK_LIST_NAME);
        if (!taskList) {
            console.log(`Task list named ${TASK_LIST_NAME} not found.`);
            return;
        }

        const { data } = await googleTasks.tasks.list({
            tasklist: taskList.id,
        });

        const taskItems = data.items;
        if (!taskItems || taskItems.length === 0) {
            console.log('No tasks found.');
            return;
        }

        const existingTasks = readCurrentTasks(FILE_PATH);
        let markdownContent = '';

        taskItems.forEach((task) => {
            if (!taskExists(existingTasks, task.title)) {
                markdownContent += `- NOW ${task.title}\n`; // Prefix "NOW" can be adjusted as needed
            }
        });

        if (markdownContent) {
            fs.appendFileSync(FILE_PATH, '\n' + markdownContent);
            console.log('New tasks appended to the file.');

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
        } else {
            console.log('No new tasks to append.');
        }
    } catch (error) {
        console.error('The API returned an error:', error);
    }
}

// Function to read existing tasks from the file
function readCurrentTasks(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.split('\n').filter((line) => line.startsWith('- '));
    } catch (error) {
        console.error('Failed to read file:', error);
        return [];
    }
}

// Function to check if a task already exists in the file
function taskExists(existingTasks, taskTitle) {
    const cleanTaskTitle = taskTitle.trim();
    return existingTasks.some((taskLine) => {
        const cleanLine = taskLine.replace(/^- (NOW|LATER|DONE) /, '').trim();
        return cleanLine === cleanTaskTitle;
    });
}

listAndAppendTasks();
