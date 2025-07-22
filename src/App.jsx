import ProtectedRoute from './component/ProtectRoute/ProtectedRoute'
import LoginPage from './component/Login/LoginPage'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'

function App() {

  return (
    <>
      {/* <LoginPage /> */}
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />

          <Route element={<ProtectedRoute />} >
            
          </Route>

        </Routes>
      </Router>
    </>
  )
}

export default App
