import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { UserProvider } from './contexts/UserContext.jsx'
import { UnreadMessagesProvider } from './contexts/UnreadMessagesContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserProvider>
      <UnreadMessagesProvider>
        <App />
      </UnreadMessagesProvider>
    </UserProvider>
  </StrictMode>,
)
