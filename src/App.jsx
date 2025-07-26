import ProtectedRoute from './component/ProtectRoute/ProtectedRoute'
import AuthPage from './component/UserAuth/AuthPage'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'

function App() {

  return (
    <>
      {/* <LoginPage /> */}
      <Router>
        <Routes>
          <Route path="/" element={<AuthPage />} />

          <Route element={<ProtectedRoute />} >
            
          </Route>

        </Routes>
      </Router>
    </>
  )
}

export default App
