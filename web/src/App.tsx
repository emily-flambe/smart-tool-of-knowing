import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import './index.css';
import Reports from './pages/Reports';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-semibold">Smart Tool of Knowing</h1>
              </div>
              <div className="ml-6 flex space-x-8">
                <Link 
                  to="/" 
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900"
                >
                  Overview
                </Link>
                <Link 
                  to="/reports" 
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
                >
                  Reports
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </main>
    </div>
  );
}

function Home() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Welcome to Smart Tool of Knowing
          </h2>
          <p className="text-gray-600 mb-4">
            A comprehensive command-line interface and web application that provides unified data integration 
            across Linear, Coda, and GitHub with AI-powered insights.
          </p>
          <Link 
            to="/reports"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Generate Reports
          </Link>
        </div>
      </div>
    </div>
  );
}

export default App