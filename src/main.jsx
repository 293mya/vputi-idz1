import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Theme } from '@radix-ui/themes'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { ruRU } from '@mui/x-date-pickers/locales'
import { BrowserRouter } from 'react-router-dom'
import '@radix-ui/themes/styles.css'
import 'dayjs/locale/ru'
import App from './App.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Theme accentColor="blue" grayColor="slate" radius="large" scaling="100%">
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale="ru"
        localeText={ruRU.components.MuiLocalizationProvider.defaultProps.localeText}
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LocalizationProvider>
    </Theme>
  </StrictMode>,
)
