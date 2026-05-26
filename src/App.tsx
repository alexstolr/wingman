import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Capabilities from "./pages/Capabilities";
import Notes from "./pages/Notes";
import Tasks from "./pages/Tasks";
import Sessions from "./pages/Sessions";
import Automations from "./pages/Automations";
import Marketplace from "./pages/Marketplace";
import Scripts from "./pages/Scripts";
import Integrations from "./pages/Integrations";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/capabilities" replace />} />
            <Route path="/capabilities" element={<Capabilities />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/automations" element={<Automations />} />
            <Route path="/scripts" element={<Scripts />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/marketplace" element={<Marketplace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
