import { Routes, Route, NavLink, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Character from './pages/Character.jsx';
import PvPLadder from './pages/PvPLadder.jsx';
import MythicLadder from './pages/MythicLadder.jsx';
import Classes from './pages/Classes.jsx';
import Realms from './pages/Realms.jsx';
import Guides from './pages/Guides.jsx';
import GuideArticle from './pages/GuideArticle.jsx';

function Nav() {
  const link = ({ isActive }) => 'link' + (isActive ? ' active' : '');
  return (
    <nav className="nav">
      <span className="brand"><Link to="/">⚔️ Azeroth Armory</Link></span>
      <NavLink to="/character" className={link}>Characters</NavLink>
      <NavLink to="/pvp" className={link}>PvP Ladder</NavLink>
      <NavLink to="/mythic" className={link}>Mythic+</NavLink>
      <NavLink to="/classes" className={link}>Classes</NavLink>
      <NavLink to="/realms" className={link}>Realms</NavLink>
      <NavLink to="/guides" className={link}>Guides</NavLink>
    </nav>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/character" element={<Character />} />
          <Route path="/pvp" element={<PvPLadder />} />
          <Route path="/mythic" element={<MythicLadder />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/realms" element={<Realms />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/guides/:slug" element={<GuideArticle />} />
        </Routes>
      </div>
    </>
  );
}
