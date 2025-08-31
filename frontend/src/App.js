import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import TeamDashboard from './pages/TeamDashboard';
import Executions from './pages/Executions';
import ExecutionDetails from './pages/ExecutionDetails';
import Failures from './pages/Failures';
import Performance from './pages/Performance';
import Layout from './components/Layout';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/team" element={<TeamDashboard />} />
              <Route path="/executions" element={<Executions />} />
              <Route path="/execution/:executionId" element={<ExecutionDetails />} />
              <Route path="/failures" element={<Failures />} />
              <Route path="/performance" element={<Performance />} />
            </Routes>
          </Layout>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
