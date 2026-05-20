import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
});

export const askQuestion = (question, role = 'executive', session_context = []) =>
  API.post('/ask', { question, role, session_context }).then((r) => r.data);

export const getRoles = () =>
  API.get('/roles').then((r) => r.data.roles);

export const getSampleQuestions = () =>
  API.get('/sample-questions').then((r) => r.data.questions);

export const getTools = () =>
  API.get('/tools').then((r) => r.data.tools);

export const getHealth = () =>
  API.get('/health').then((r) => r.data);
