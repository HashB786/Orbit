import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { UserProvider } from './context/UserContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <LanguageProvider>
            <ThemeProvider>
                <UserProvider>
                    <App />
                </UserProvider>
            </ThemeProvider>
        </LanguageProvider>
    </React.StrictMode>,
)
