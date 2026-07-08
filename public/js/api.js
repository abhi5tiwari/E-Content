const API = {
  async request(url, options = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json'
    };

    // If there's a token stored in localStorage, we can append it as a fallback header
    const token = localStorage.getItem('token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    options.headers = {
      ...defaultHeaders,
      ...options.headers
    };

    try {
      const response = await fetch(url, options);
      
      // If unauthorized, clear storage and send to index page
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
          window.location.href = '/';
        }
        return { success: false, message: 'Session expired. Please log in again.' };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API Error on ${url}:`, error);
      return { success: false, message: 'Network connection error. Server might be offline.' };
    }
  },

  get(url) {
    return this.request(url, { method: 'GET' });
  },

  post(url, body) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(url, body) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  delete(url) {
    return this.request(url, { method: 'DELETE' });
  }
};
