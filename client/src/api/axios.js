import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const BASE_URL = apiUrl.replace(/\/api$/, '');

export const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return `${BASE_URL}/${url}`;
};

const api = axios.create({
    baseURL: apiUrl,
});

// Add auth interceptor
api.interceptors.request.use((config) => {
    const adminToken = localStorage.getItem('adminToken');
    const sessionToken = sessionStorage.getItem('voteSessionToken');

    // Prioritize Voter Session Token for specific voter actions
    if (config.url && config.url.includes('/vote/submit') && sessionToken) {
        config.headers.Authorization = `Bearer ${sessionToken}`;
    }
    // Otherwise use Admin Token if available
    else if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
    }
    // Fallback to Session Token (e.g. for start session or other future voter routes)
    else if (sessionToken) {
        config.headers.Authorization = `Bearer ${sessionToken}`;
    }

    return config;
});

export default api;
