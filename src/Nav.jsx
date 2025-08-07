import ProtectedRoute from './component/ProtectRoute/ProtectedRoute'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import AuthPage from './component/UserAuth/AuthPage'
import Home from './component/Home/Home'

function App() {

  return (
    <>
      {/* <LoginPage /> */}
      <Router>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />

          <Route element={<ProtectedRoute />} >
            <Route path="/" element={<Home />} />
          </Route>

        </Routes>
      </Router>
    </>
  )
}

export default App
