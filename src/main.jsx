import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { UserProvider } from './context/UserContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { detectLanguage, loadLanguage, setCurrentLanguage } from './i18n'

const start = (lang) => {
    setCurrentLanguage(lang);
    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <LanguageProvider initial={lang}>
                <ThemeProvider>
                    <AuthProvider>
                        <UserProvider>
                            <App />
                        </UserProvider>
                    </AuthProvider>
                </ThemeProvider>
            </LanguageProvider>
        </React.StrictMode>,
    );
};

// Load Uzbek/Russian before the first paint (a small file); fall back to English if it fails
const lang = detectLanguage();
if (lang === 'en') start('en');
else loadLanguage(lang).then(() => start(lang), () => start('en'));
