import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:8000' });

export const askQuestion = (question) =>
  API.post('/ask', { question }).then((r) => r.data);

export const getSampleQuestions = () =>
  API.get('/sample-questions').then((r) => r.data.questions);

export const getTools = () =>
  API.get('/tools').then((r) => r.data.tools);

export const getHealth = () =>
  API.get('/health').then((r) => r.data);
