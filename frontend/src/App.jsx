import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { StoreProvider } from './store'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import Home from './pages/Home'
import ConvertPage from './pages/ConvertPage'
import NotFound from './pages/NotFound'
import { useFormats } from './hooks/useFormats'
import './styles.css'

function AppShell() {
  useFormats()
  return (
    <div className="fz-app">
      <Header />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/convert/:slug" element={<ConvertPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </StoreProvider>
  )
}
