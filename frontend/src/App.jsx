import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
// Placeholder imports for pages
import Login from './pages/Login';
import RegisterVictim from './pages/RegisterVictim';
import RegisterLawyer from './pages/RegisterLawyer';
import VictimDashboard from './pages/VictimDashboard';
import LawyerDashboard from './pages/LawyerDashboard';
import LawyerListings from './pages/LawyerListings';
import LawyerProfile from './pages/LawyerProfile';
import PostCase from './pages/PostCase';
import ProposalsInbox from './pages/ProposalsInbox';
import Chat from './pages/Chat';
import Payment from './pages/Payment';
import AdminPanel from './pages/AdminPanel';
import SubmitProposal from './pages/SubmitProposal';
import ReviewLawyer from "./pages/ReviewLawyer";


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<LandingPage />} />
            <Route path="login" element={<Login />} />
            <Route path="register/victim" element={<RegisterVictim />} />
            <Route path="register/lawyer" element={<RegisterLawyer />} />
            
            {/* Protected Routes placeholder structure */}
            <Route path="victim-dashboard" element={<VictimDashboard />} />
            <Route path="post-case" element={<PostCase />} />
            <Route path="proposals" element={<ProposalsInbox />} />
            
            <Route path="lawyer-dashboard" element={<LawyerDashboard />} />
            <Route path="lawyer-listings" element={<LawyerListings />} />
            <Route path="lawyer/:id" element={<LawyerProfile />} />
            
            <Route path="chat/:engagementId" element={<Chat />} />
            <Route path="payment/:engagementId" element={<Payment />} />
            
            <Route path="admin" element={<AdminPanel />} />
            <Route path="submit-proposal/:caseId" element={<SubmitProposal />} />
            <Route path="review/:engagementId" element={<ReviewLawyer />} />

          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
