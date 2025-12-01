// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";

import Home from "./pages/Home.jsx";
import Reports from "./pages/Reports.jsx";
import Departments from "./pages/Departments.jsx";
import CreateReport from "./pages/CreateReport.jsx";
import Analytics from "./pages/Analytics.jsx";
import ReportDetail from "./pages/ReportDetail.jsx";   // 🔹 NEW

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/reports/new" element={<CreateReport />} />
        <Route path="/reports/:id" element={<ReportDetail />} /> {/* 🔹 NEW */}
        <Route path="/departments" element={<Departments />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </>
  );
}
