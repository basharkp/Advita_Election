import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { VoteProvider } from './context/VoteContext';
import AdminLayout from './components/admin/AdminLayout';
import LoginForm from './components/admin/LoginForm';
import AdminDashboard from './components/admin/AdminDashboard';
import VoterFlow from './components/voter/VoterFlow';
import BoothSelectionPage from './components/voter/BoothSelectionPage';
import PublicResults from './components/public/PublicResults';

function App() {
  return (
    <Router>
      <AuthProvider>
        <VoteProvider>
          <Routes>
            {/* Admin Routes */}
            <Route path="/admin/login" element={<LoginForm />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
            </Route>

            {/* Voter Routes */}
            <Route path="/" element={<BoothSelectionPage />} />
            <Route path="/vote" element={<VoterFlow />} />

            {/* Public Results Routes */}
            <Route path="/results/:electionId" element={<PublicResults />} />
            <Route path="/results" element={<PublicResults />} />
          </Routes>
        </VoteProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
