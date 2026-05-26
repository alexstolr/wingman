import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Capabilities from "./pages/Capabilities";
import Notes from "./pages/Notes";
import Documents from "./pages/Documents";
import Tasks from "./pages/Tasks";
import Sessions from "./pages/Sessions";
import Automations from "./pages/Automations";
import Marketplace from "./pages/Marketplace";
import Scripts from "./pages/Scripts";
import Integrations from "./pages/Integrations";
import Communications from "./pages/Communications";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/capabilities" element={<Capabilities />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/automations" element={<Automations />} />
            <Route path="/communications" element={<Communications />} />
            <Route path="/scripts" element={<Scripts />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/marketplace" element={<Marketplace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
