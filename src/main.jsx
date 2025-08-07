import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Nav from './Nav.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import { Provider } from 'react-redux';
import store from './Redux/Store/store.js';

createRoot(document.getElementById('root')).render(
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_OAUTH_KEY}>
        <Provider store={store}>
            <Toaster position="top-center" reverseOrder={false} />
            <Nav />
        </Provider>
    </GoogleOAuthProvider>
)
