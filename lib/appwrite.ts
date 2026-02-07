import { Client, Account, Databases } from 'appwrite';

const client = new Client();

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!endpoint || !projectId) {
    console.warn("Appwrite endpoint or project ID is missing in environment variables.");
}

client
    .setEndpoint(endpoint || 'https://cloud.appwrite.io/v1')
    .setProject(projectId || '');

export const account = new Account(client);
export const databases = new Databases(client);
export { client };
