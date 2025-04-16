import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Welcome from './pages/Welcome';
import CreateWallet from './pages/CreateWallet';
import ConfirmMnemonic from './pages/ConfirmMnemonic';
import ImportWallet from './pages/ImportWallet';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <Router>
      <div className="flex justify-center items-center h-screen bg-white px-2 py-10 overflow-y-hidden">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/create" element={<CreateWallet />} />
          <Route path="/confirm" element={<ConfirmMnemonic />} />
          <Route path="/import" element={<ImportWallet />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}
